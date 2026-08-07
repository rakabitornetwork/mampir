<?php

namespace App\Http\Controllers;

use App\Models\SyncLog;
use App\Services\MikroTik\ChrClient;
use App\Services\MikroTik\ChrSyncService;
use App\Services\SubscriptionService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

class SyncController extends Controller
{
    public function index(ChrClient $client): Response
    {
        $logs = SyncLog::query()->latest()->limit(20)->get()->map(fn (SyncLog $log) => [
            'id' => $log->id,
            'type' => $log->type,
            'status' => $log->status,
            'customers_synced' => $log->customers_synced,
            'ports_synced' => $log->ports_synced,
            'message' => $log->message,
            'created_at' => $log->created_at?->toIso8601String(),
        ]);

        $chrInfo = null;
        $error = null;
        try {
            $identity = $client->identity();
            $resource = $client->resource();
            $chrInfo = [
                'identity' => $identity['name'] ?? null,
                'version' => $resource['version'] ?? null,
                'uptime' => $resource['uptime'] ?? null,
                'cpu_load' => $resource['cpu_load'] ?? null,
                'board_name' => $resource['board_name'] ?? null,
                'public_ip' => config('chr.public_ip'),
                'host' => config('chr.host'),
            ];
            $client->disconnect();
        } catch (\Throwable $e) {
            $error = $e->getMessage();
        }

        return Inertia::render('Sync/Index', [
            'logs' => $logs,
            'chrInfo' => $chrInfo,
            'error' => $error,
        ]);
    }

    public function pull(ChrSyncService $sync): RedirectResponse
    {
        try {
            $result = $sync->safePull();
        } catch (\Throwable $e) {
            return back()->with('error', 'Sinkronisasi gagal: '.$e->getMessage());
        }

        return back()->with(
            'success',
            "Sinkronisasi berhasil: {$result['customers']} pelanggan, {$result['ports']} port, {$result['online']} online."
        );
    }

    public function expire(SubscriptionService $subscriptions): RedirectResponse
    {
        $result = $subscriptions->processExpirations(true);

        return back()->with(
            'success',
            "Expiry diproses: {$result['expired']} expired, {$result['disabled']} di-disable di CHR."
        );
    }
}
