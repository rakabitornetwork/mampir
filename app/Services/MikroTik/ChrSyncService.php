<?php

namespace App\Services\MikroTik;

use App\Models\Customer;
use App\Models\PortForward;
use App\Models\SyncLog;
use App\Models\Tunnel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

class ChrSyncService
{
    public function __construct(
        protected ChrClient $client,
        protected PortAllocator $allocator,
    ) {}

    /**
     * Pull customers, tunnels, and NAT rules from CHR into the app database.
     *
     * @return array{customers:int, ports:int, online:int, identity:string}
     */
    public function pull(): array
    {
        $identity = $this->client->identity();
        $secrets = collect($this->client->pppSecrets())
            ->filter(fn ($s) => ($s['service'] ?? 'l2tp') === 'l2tp')
            ->values();
        $active = collect($this->client->pppActive())->keyBy('name');
        $nats = collect($this->client->natRules())
            ->filter(fn ($n) => filled($n['to_addresses']))
            ->groupBy('to_addresses');

        $customersSynced = 0;
        $portsSynced = 0;
        $online = 0;

        DB::transaction(function () use ($secrets, $active, $nats, &$customersSynced, &$portsSynced, &$online) {
            $seenUsernames = [];

            foreach ($secrets as $secret) {
                $username = $secret['name'];
                $seenUsernames[] = $username;
                $remote = $secret['remote_address'] ?? null;
                if (! $remote) {
                    continue;
                }

                $display = $this->humanize($username);
                $isOnline = $active->has($username);
                if ($isOnline) {
                    $online++;
                }

                $customer = Customer::query()->updateOrCreate(
                    ['username' => $username],
                    [
                        'name' => Customer::query()->where('username', $username)->value('name') ?: $display,
                        'password' => $secret['password'] ?? Customer::query()->where('username', $username)->value('password'),
                        'status' => ($secret['disabled'] ?? false) ? 'suspended' : (Customer::query()->where('username', $username)->value('status') ?: 'active'),
                        'synced_from_chr' => true,
                        'last_synced_at' => now(),
                    ]
                );

                // Preserve existing subscription expiry; only set active if no status conflict
                if (! $customer->expires_at && $customer->status !== 'suspended') {
                    $customer->status = ($secret['disabled'] ?? false) ? 'suspended' : 'active';
                    $customer->save();
                } elseif ($customer->isExpired()) {
                    $customer->status = 'expired';
                    $customer->save();
                }

                $tunnel = Tunnel::query()->updateOrCreate(
                    ['remote_address' => $remote],
                    [
                        'customer_id' => $customer->id,
                        'service' => $secret['service'] ?? 'l2tp',
                        'profile' => $secret['profile'] ?? config('chr.default_profile'),
                        'local_address' => $secret['local_address'] ?? config('chr.tunnel_gateway'),
                        'chr_enabled' => ! ($secret['disabled'] ?? false),
                        'is_online' => $isOnline,
                        'caller_id' => $active[$username]['caller_id'] ?? null,
                        'uptime' => $active[$username]['uptime'] ?? null,
                        'last_seen_at' => $isOnline ? now() : $customer->tunnel?->last_seen_at,
                    ]
                );

                // Ensure one tunnel per customer
                Tunnel::query()
                    ->where('customer_id', $customer->id)
                    ->where('id', '!=', $tunnel->id)
                    ->delete();

                $rules = $nats->get($remote, collect());
                $publicPorts = $rules->pluck('public_port')->filter()->map(fn ($p) => (int) $p)->all();
                $block = $this->allocator->inferBlockFromPorts($publicPorts);
                if ($block) {
                    $tunnel->update(['port_block' => $block]);
                }

                $keptIds = [];
                foreach ($rules as $rule) {
                    if (! $rule['public_port']) {
                        continue;
                    }

                    $serviceKey = $this->guessServiceKey((int) $rule['local_port']);
                    $label = $serviceKey
                        ? (config("chr.service_templates.{$serviceKey}.label") ?? 'Custom')
                        : ($this->labelFromComment($rule['comment']) ?: 'Custom');

                    $pf = PortForward::query()->updateOrCreate(
                        [
                            'tunnel_id' => $tunnel->id,
                            'public_port' => (int) $rule['public_port'],
                            'protocol' => $rule['protocol'] ?? 'tcp',
                        ],
                        [
                            'label' => $label,
                            'service_key' => $serviceKey,
                            'public_port_end' => $rule['public_port_end'] ? (int) $rule['public_port_end'] : (int) $rule['public_port'],
                            'local_port' => (int) $rule['local_port'],
                            'local_port_end' => $rule['local_port_end'] ? (int) $rule['local_port_end'] : (int) $rule['local_port'],
                            'comment' => $rule['comment'] ?: null,
                            'enabled' => ! ($rule['disabled'] ?? false),
                            'synced_from_chr' => true,
                        ]
                    );
                    $keptIds[] = $pf->id;
                    $portsSynced++;
                }

                // Remove stale synced forwards no longer on CHR
                PortForward::query()
                    ->where('tunnel_id', $tunnel->id)
                    ->where('synced_from_chr', true)
                    ->when($keptIds !== [], fn ($q) => $q->whereNotIn('id', $keptIds))
                    ->when($keptIds === [], fn ($q) => $q)
                    ->delete();

                $customersSynced++;
            }
        });

        $result = [
            'customers' => $customersSynced,
            'ports' => $portsSynced,
            'online' => $online,
            'identity' => $identity['name'] ?? 'CHR',
        ];

        SyncLog::query()->create([
            'type' => 'pull',
            'status' => 'success',
            'customers_synced' => $customersSynced,
            'ports_synced' => $portsSynced,
            'message' => "Sinkronisasi dari {$result['identity']} berhasil",
            'payload' => $result,
        ]);

        $this->client->disconnect();

        return $result;
    }

    public function pushCustomer(Customer $customer): void
    {
        $customer->loadMissing('tunnel.portForwards');
        $tunnel = $customer->tunnel;
        if (! $tunnel) {
            throw new \RuntimeException('Pelanggan belum memiliki tunnel.');
        }

        $password = $customer->password;
        if (! $password) {
            $password = Str::password(12, symbols: false);
            $customer->update(['password' => $password]);
        }

        $this->client->ensurePppSecret([
            'name' => $customer->username,
            'password' => $password,
            'service' => $tunnel->service,
            'profile' => $tunnel->profile,
            'local_address' => $tunnel->local_address,
            'remote_address' => $tunnel->remote_address,
            'disabled' => $customer->status !== 'active' || ! $tunnel->chr_enabled,
        ]);

        foreach ($tunnel->portForwards as $pf) {
            $this->client->addDstNat([
                'comment' => $pf->comment ?: sprintf('Port %s | %s', $pf->localPortLabel(), strtoupper($customer->name)),
                'protocol' => $pf->protocol,
                'dst_address' => config('chr.public_ip'),
                'public_port' => $pf->public_port,
                'public_port_end' => $pf->public_port_end ?: $pf->public_port,
                'to_addresses' => $tunnel->remote_address,
                'local_port' => $pf->local_port,
                'local_port_end' => $pf->local_port_end ?: $pf->local_port,
                'disabled' => ! $pf->enabled,
            ]);
        }

        $customer->update([
            'synced_from_chr' => true,
            'last_synced_at' => now(),
        ]);

        $this->client->disconnect();
    }

    public function applyExpiryOnChr(Customer $customer): void
    {
        $disabled = $customer->status !== 'active';
        $this->client->setPppSecretDisabled($customer->username, $disabled);
        if ($disabled) {
            $this->client->disconnectPppActive($customer->username);
        }
        if ($customer->tunnel) {
            $customer->tunnel->update(['chr_enabled' => ! $disabled]);
        }
        $this->client->disconnect();
    }

    public function removeCustomerFromChr(Customer $customer): void
    {
        $customer->loadMissing('tunnel');
        $username = $customer->username;
        $remoteAddress = $customer->tunnel?->remote_address;

        if ($username) {
            $this->client->removePppSecret($username);
        }

        if ($remoteAddress) {
            $this->client->removeNatByToAddresses($remoteAddress);
        }

        $this->client->disconnect();
    }

    public function safePull(): array
    {
        try {
            return $this->pull();
        } catch (Throwable $e) {
            SyncLog::query()->create([
                'type' => 'pull',
                'status' => 'failed',
                'message' => $e->getMessage(),
            ]);
            throw $e;
        }
    }

    protected function humanize(string $username): string
    {
        return Str::title(str_replace(['_', '-', '.'], ' ', $username));
    }

    protected function guessServiceKey(int $localPort): ?string
    {
        foreach (config('chr.service_templates') as $key => $tpl) {
            if ((int) $tpl['local_port'] === $localPort) {
                return $key;
            }
        }

        return null;
    }

    protected function labelFromComment(string $comment): ?string
    {
        if (preg_match('/Port\s+\d+\s+([^|]+)/i', $comment, $m)) {
            return trim($m[1]);
        }

        return null;
    }
}
