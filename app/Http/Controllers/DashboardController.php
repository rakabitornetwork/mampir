<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\PortForward;
use App\Models\Subscription;
use App\Models\SyncLog;
use App\Models\Tunnel;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $now = now();

        $stats = [
            'customers' => Customer::query()->count(),
            'active' => Customer::query()->where('status', 'active')->count(),
            'online' => Tunnel::query()->where('is_online', true)->count(),
            'expired' => Customer::query()->where('status', 'expired')->count(),
            'expiring_soon' => Customer::query()
                ->where('status', 'active')
                ->whereNotNull('expires_at')
                ->whereBetween('expires_at', [$now, $now->copy()->addDays(7)])
                ->count(),
            'ports' => PortForward::query()->count(),
            'subscriptions' => Subscription::query()->where('status', 'active')->count(),
        ];

        $recentCustomers = Customer::query()
            ->with(['tunnel.portForwards'])
            ->latest()
            ->limit(8)
            ->get()
            ->map(fn (Customer $c) => $this->customerCard($c));

        $onlineTunnels = Tunnel::query()
            ->with('customer')
            ->where('is_online', true)
            ->orderByDesc('last_seen_at')
            ->limit(10)
            ->get()
            ->map(fn (Tunnel $t) => [
                'id' => $t->id,
                'username' => $t->customer?->username,
                'name' => $t->customer?->name,
                'remote_address' => $t->remote_address,
                'caller_id' => $t->caller_id,
                'uptime' => $t->uptime,
            ]);

        $expiring = Customer::query()
            ->where('status', 'active')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', $now->copy()->addDays(14))
            ->orderBy('expires_at')
            ->limit(8)
            ->get()
            ->map(fn (Customer $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'username' => $c->username,
                'expires_at' => $c->expires_at?->toIso8601String(),
                'days_remaining' => $c->daysRemaining(),
            ]);

        $lastSync = SyncLog::query()->latest()->first();

        $portUsage = PortForward::query()
            ->select('service_key', DB::raw('count(*) as total'))
            ->groupBy('service_key')
            ->pluck('total', 'service_key');

        return Inertia::render('Dashboard', [
            'stats' => $stats,
            'recentCustomers' => $recentCustomers,
            'onlineTunnels' => $onlineTunnels,
            'expiring' => $expiring,
            'lastSync' => $lastSync ? [
                'status' => $lastSync->status,
                'message' => $lastSync->message,
                'created_at' => $lastSync->created_at?->toIso8601String(),
                'customers_synced' => $lastSync->customers_synced,
                'ports_synced' => $lastSync->ports_synced,
            ] : null,
            'portUsage' => $portUsage,
            'chr' => [
                'public_ip' => config('chr.public_ip'),
                'host' => config('chr.host'),
                'port' => (int) config('chr.port', 8728),
            ],
        ]);
    }

    protected function customerCard(Customer $c): array
    {
        return [
            'id' => $c->id,
            'name' => $c->name,
            'username' => $c->username,
            'status' => $c->status,
            'expires_at' => $c->expires_at?->toIso8601String(),
            'days_remaining' => $c->daysRemaining(),
            'is_online' => (bool) $c->tunnel?->is_online,
            'remote_address' => $c->tunnel?->remote_address,
            'ports_count' => $c->tunnel?->portForwards?->count() ?? 0,
            'synced_from_chr' => $c->synced_from_chr,
        ];
    }
}
