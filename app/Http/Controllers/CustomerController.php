<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\PortForward;
use App\Models\SubscriptionPlan;
use App\Models\Tunnel;
use App\Services\MikroTik\ChrSyncService;
use App\Services\MikroTik\PortAllocator;
use App\Services\MikroTik\ScriptGenerator;
use App\Services\SubscriptionService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CustomerController extends Controller
{
    public function __construct(
        protected PortAllocator $allocator,
        protected ScriptGenerator $scripts,
        protected SubscriptionService $subscriptions,
        protected ChrSyncService $chrSync,
    ) {}

    public function index(Request $request): Response
    {
        $q = trim((string) $request->get('q', ''));
        $status = $request->get('status');

        $customers = Customer::query()
            ->with(['tunnel.portForwards'])
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($inner) use ($q) {
                    $inner->where('name', 'like', "%{$q}%")
                        ->orWhere('username', 'like', "%{$q}%")
                        ->orWhere('company', 'like', "%{$q}%")
                        ->orWhereHas('tunnel', fn ($t) => $t->where('remote_address', 'like', "%{$q}%"));
                });
            })
            ->when($status, fn ($query) => $query->where('status', $status))
            ->latest()
            ->paginate(12)
            ->withQueryString()
            ->through(fn (Customer $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'username' => $c->username,
                'company' => $c->company,
                'status' => $c->status,
                'expires_at' => $c->expires_at?->toIso8601String(),
                'days_remaining' => $c->daysRemaining(),
                'is_online' => (bool) $c->tunnel?->is_online,
                'remote_address' => $c->tunnel?->remote_address,
                'port_block' => $c->tunnel?->port_block,
                'ports_count' => $c->tunnel?->portForwards?->count() ?? 0,
                'synced_from_chr' => $c->synced_from_chr,
                'last_synced_at' => $c->last_synced_at?->toIso8601String(),
            ]);

        return Inertia::render('Customers/Index', [
            'customers' => $customers,
            'filters' => ['q' => $q, 'status' => $status],
            'counts' => [
                'all' => Customer::query()->count(),
                'active' => Customer::query()->where('status', 'active')->count(),
                'online' => Tunnel::query()->where('is_online', true)->count(),
                'expired' => Customer::query()->where('status', 'expired')->count(),
            ],
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('Customers/Form', [
            'customer' => null,
            'plans' => $this->plansPayload(),
            'serviceTemplates' => config('chr.service_templates'),
            'defaults' => [
                'duration_days' => 30,
                'services' => array_keys(config('chr.service_templates')),
                'allocate_random_block' => true,
                'push_to_chr' => false,
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $this->validated($request);

        $customer = DB::transaction(function () use ($data, $request) {
            $password = $data['password'] ?: Str::password(12, symbols: false);
            $block = ! empty($data['allocate_random_block'])
                ? $this->allocator->allocateRandomBlock()
                : (int) $data['port_block'];
            $remote = $data['remote_address'] ?: $this->allocator->nextRemoteAddress();

            $customer = Customer::query()->create([
                'name' => $data['name'],
                'username' => $data['username'],
                'password' => $password,
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'company' => $data['company'] ?? null,
                'notes' => $data['notes'] ?? null,
                'status' => 'draft',
            ]);

            $tunnel = Tunnel::query()->create([
                'customer_id' => $customer->id,
                'service' => 'l2tp',
                'profile' => config('chr.default_profile'),
                'local_address' => config('chr.tunnel_gateway'),
                'remote_address' => $remote,
                'port_block' => $block,
                'chr_enabled' => false,
            ]);

            $forwards = $this->allocator->buildStandardForwards(
                $block,
                $customer->name,
                $data['services'] ?? array_keys(config('chr.service_templates'))
            );

            foreach ($forwards as $forward) {
                PortForward::query()->create([...$forward, 'tunnel_id' => $tunnel->id]);
            }

            $plan = isset($data['plan_id'])
                ? SubscriptionPlan::query()->find($data['plan_id'])
                : null;

            $duration = (int) ($data['duration_days'] ?? $plan?->duration_days ?? 30);

            $this->subscriptions->assign(
                customer: $customer->fresh('tunnel'),
                durationDays: $duration,
                plan: $plan,
                pushToChr: false,
            );

            return $customer->fresh(['tunnel.portForwards']);
        });

        if ($request->boolean('push_to_chr')) {
            try {
                $this->chrSync->pushCustomer($customer);
            } catch (\Throwable $e) {
                return redirect()
                    ->route('customers.show', $customer)
                    ->with('warning', 'Pelanggan dibuat, tapi push ke CHR gagal: '.$e->getMessage());
            }
        }

        return redirect()
            ->route('customers.show', $customer)
            ->with('success', 'Pelanggan tunnel berhasil dibuat.');
    }

    public function show(Customer $customer): Response
    {
        $customer->load(['tunnel.portForwards', 'subscriptions.plan', 'activeSubscription.plan']);

        return Inertia::render('Customers/Show', [
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'username' => $customer->username,
                'password' => $customer->password,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'company' => $customer->company,
                'notes' => $customer->notes,
                'status' => $customer->status,
                'synced_from_chr' => $customer->synced_from_chr,
                'starts_at' => $customer->starts_at?->toIso8601String(),
                'expires_at' => $customer->expires_at?->toIso8601String(),
                'duration_days' => $customer->duration_days,
                'days_remaining' => $customer->daysRemaining(),
                'last_synced_at' => $customer->last_synced_at?->toIso8601String(),
                'tunnel' => $customer->tunnel ? [
                    'id' => $customer->tunnel->id,
                    'service' => $customer->tunnel->service,
                    'profile' => $customer->tunnel->profile,
                    'local_address' => $customer->tunnel->local_address,
                    'remote_address' => $customer->tunnel->remote_address,
                    'port_block' => $customer->tunnel->port_block,
                    'chr_enabled' => $customer->tunnel->chr_enabled,
                    'is_online' => $customer->tunnel->is_online,
                    'caller_id' => $customer->tunnel->caller_id,
                    'uptime' => $customer->tunnel->uptime,
                    'port_forwards' => $customer->tunnel->portForwards->map(fn (PortForward $pf) => [
                        'id' => $pf->id,
                        'label' => $pf->label,
                        'service_key' => $pf->service_key,
                        'public_port' => $pf->public_port,
                        'public_port_end' => $pf->public_port_end,
                        'local_port' => $pf->local_port,
                        'local_port_end' => $pf->local_port_end,
                        'public_label' => $pf->publicPortLabel(),
                        'local_label' => $pf->localPortLabel(),
                        'protocol' => $pf->protocol,
                        'comment' => $pf->comment,
                        'enabled' => $pf->enabled,
                    ]),
                ] : null,
                'subscriptions' => $customer->subscriptions->map(fn ($s) => [
                    'id' => $s->id,
                    'plan' => $s->plan?->name,
                    'duration_days' => $s->duration_days,
                    'starts_at' => $s->starts_at?->toIso8601String(),
                    'expires_at' => $s->expires_at?->toIso8601String(),
                    'status' => $s->status,
                    'amount' => $s->amount,
                    'notes' => $s->notes,
                ]),
            ],
            'scripts' => [
                'server' => $this->scripts->serverScript($customer),
                'client' => $this->scripts->clientScript($customer),
            ],
            'plans' => $this->plansPayload(),
            'publicIp' => config('chr.public_ip'),
        ]);
    }

    public function edit(Customer $customer): Response
    {
        $customer->load('tunnel');

        return Inertia::render('Customers/Form', [
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'username' => $customer->username,
                'password' => $customer->password,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'company' => $customer->company,
                'notes' => $customer->notes,
                'status' => $customer->status,
                'duration_days' => $customer->duration_days,
                'remote_address' => $customer->tunnel?->remote_address,
                'port_block' => $customer->tunnel?->port_block,
            ],
            'plans' => $this->plansPayload(),
            'serviceTemplates' => config('chr.service_templates'),
            'defaults' => [
                'duration_days' => $customer->duration_days ?? 30,
                'services' => array_keys(config('chr.service_templates')),
                'allocate_random_block' => false,
                'push_to_chr' => false,
            ],
        ]);
    }

    public function update(Request $request, Customer $customer): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'username' => ['required', 'string', 'max:60', Rule::unique('customers', 'username')->ignore($customer->id)],
            'password' => ['nullable', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'company' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string'],
            'status' => ['required', Rule::in(['active', 'expired', 'suspended', 'draft'])],
        ]);

        $customer->update($data);

        return redirect()
            ->route('customers.show', $customer)
            ->with('success', 'Data pelanggan diperbarui.');
    }

    public function destroy(Customer $customer): RedirectResponse
    {
        try {
            $this->chrSync->removeCustomerFromChr($customer);
        } catch (\Throwable $e) {
            report($e);
        }

        $customer->delete();

        return redirect()
            ->route('customers.index')
            ->with('success', 'Pelanggan dan konfigurasi MikroTik CHR berhasil dihapus.');
    }

    public function renew(Request $request, Customer $customer): RedirectResponse
    {
        $data = $request->validate([
            'plan_id' => ['nullable', 'exists:subscription_plans,id'],
            'duration_days' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'push_to_chr' => ['sometimes', 'boolean'],
        ]);

        $plan = isset($data['plan_id']) ? SubscriptionPlan::query()->find($data['plan_id']) : null;
        $days = (int) ($data['duration_days'] ?? $plan?->duration_days ?? 30);

        $this->subscriptions->assign(
            customer: $customer,
            durationDays: $days,
            plan: $plan,
            pushToChr: $request->boolean('push_to_chr', true),
        );

        return back()->with('success', "Langganan diperbarui untuk {$days} hari.");
    }

    public function push(Customer $customer): RedirectResponse
    {
        try {
            $this->chrSync->pushCustomer($customer);
        } catch (\Throwable $e) {
            return back()->with('error', 'Push ke CHR gagal: '.$e->getMessage());
        }

        return back()->with('success', 'Konfigurasi berhasil di-push ke CHR.');
    }

    protected function validated(Request $request, ?Customer $customer = null): array
    {
        $tunnelId = $customer?->tunnel?->id;

        return $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'username' => ['required', 'string', 'max:60', 'alpha_dash', Rule::unique('customers', 'username')->ignore($customer?->id)],
            'password' => ['nullable', 'string', 'max:120'],
            'email' => ['nullable', 'email', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'company' => ['nullable', 'string', 'max:120'],
            'notes' => ['nullable', 'string'],
            'plan_id' => ['nullable', 'exists:subscription_plans,id'],
            'duration_days' => ['nullable', 'integer', 'min:1', 'max:3650'],
            'allocate_random_block' => ['sometimes', 'boolean'],
            'port_block' => [
                'nullable',
                'integer',
                'min:1000',
                'max:65000',
                Rule::unique('tunnels', 'port_block')->ignore($tunnelId),
                function ($attribute, $value, $fail) use ($tunnelId) {
                    if ($value && ! $this->allocator->isBlockAvailable((int) $value, $tunnelId)) {
                        $fail('Port block ini atau port publik di dalamnya sudah terpakai.');
                    }
                },
            ],
            'remote_address' => [
                'nullable',
                'ip',
                Rule::unique('tunnels', 'remote_address')->ignore($tunnelId),
                function ($attribute, $value, $fail) {
                    if ($value === config('chr.tunnel_gateway')) {
                        $fail('IP address ini digunakan sebagai Gateway CHR.');
                    }
                    if ($value === config('chr.public_ip')) {
                        $fail('IP address ini digunakan sebagai Public IP CHR.');
                    }
                },
            ],
            'services' => ['nullable', 'array'],
            'services.*' => ['string'],
            'push_to_chr' => ['sometimes', 'boolean'],
        ]);
    }

    protected function plansPayload(): array
    {
        return SubscriptionPlan::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(fn (SubscriptionPlan $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'duration_days' => $p->duration_days,
                'price' => $p->price,
                'description' => $p->description,
            ])
            ->all();
    }
}
