<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use App\Services\ChrSettingsService;
use App\Services\MikroTik\ChrClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class SettingsController extends Controller
{
    public function index(ChrSettingsService $chrSettings): Response
    {
        return Inertia::render('Settings/Index', [
            'plans' => SubscriptionPlan::query()->orderBy('sort_order')->get(),
            'chr' => $chrSettings->forPanel(),
        ]);
    }

    public function updateChr(Request $request, ChrSettingsService $chrSettings): RedirectResponse
    {
        $data = $request->validate([
            'host' => ['required', 'string', 'max:255'],
            'port' => ['required', 'integer', 'min:1', 'max:65535'],
            'username' => ['required', 'string', 'max:120'],
            'password' => ['nullable', 'string', 'max:255'],
            'ssl' => ['sometimes', 'boolean'],
            'timeout' => ['nullable', 'integer', 'min:3', 'max:120'],
            'public_ip' => ['required', 'string', 'max:64'],
            'tunnel_gateway' => ['required', 'string', 'max:64'],
            'tunnel_network' => ['required', 'string', 'max:64'],
            'tunnel_start_host' => ['required', 'integer', 'min:1', 'max:254'],
            'tunnel_end_host' => ['required', 'integer', 'min:1', 'max:254', 'gte:tunnel_start_host'],
            'default_profile' => ['required', 'string', 'max:120'],
            'port_block_start' => ['required', 'integer', 'min:1', 'max:65535'],
            'port_block_end' => ['required', 'integer', 'min:1', 'max:65535', 'gte:port_block_start'],
            'port_block_step' => ['required', 'integer', 'min:1', 'max:10000'],
            'service_templates' => ['required', 'array', 'min:1'],
            'service_templates.*.label' => ['required', 'string', 'max:80'],
            'service_templates.*.local_port' => ['required', 'integer', 'min:1', 'max:65535'],
            'service_templates.*.offset' => ['required', 'integer', 'min:0', 'max:65535'],
            'service_templates.*.icon' => ['nullable', 'string', 'max:40'],
        ]);

        foreach (array_keys($data['service_templates']) as $key) {
            if (! is_string($key) || ! preg_match('/^[a-z0-9_\-]+$/', $key)) {
                return back()->with('error', "Key template layanan tidak valid: {$key}");
            }
        }

        $chrSettings->update($data);

        return back()->with('success', 'Pengaturan CHR disimpan. Perubahan langsung dipakai tanpa edit .env.');
    }

    public function testChr(Request $request, ChrSettingsService $chrSettings, ChrClient $client): RedirectResponse
    {
        $current = $chrSettings->all();

        $data = $request->validate([
            'host' => ['nullable', 'string', 'max:255'],
            'port' => ['nullable', 'integer', 'min:1', 'max:65535'],
            'username' => ['nullable', 'string', 'max:120'],
            'password' => ['nullable', 'string', 'max:255'],
            'ssl' => ['sometimes', 'boolean'],
            'timeout' => ['nullable', 'integer', 'min:3', 'max:120'],
        ]);

        $password = (string) ($current['password'] ?? '');
        if (isset($data['password']) && is_string($data['password']) && $data['password'] !== '') {
            $password = $data['password'];
        }

        $probe = array_replace($current, [
            'host' => trim((string) ($data['host'] ?? $current['host'] ?? '')),
            'port' => (int) ($data['port'] ?? $current['port'] ?? 8728),
            'username' => trim((string) ($data['username'] ?? $current['username'] ?? '')),
            'password' => $password,
            'ssl' => array_key_exists('ssl', $data) ? (bool) $data['ssl'] : (bool) ($current['ssl'] ?? false),
            'timeout' => (int) ($data['timeout'] ?? $current['timeout'] ?? 15),
        ]);

        if ($probe['host'] === '' || $probe['username'] === '') {
            return back()->with('error', 'Host dan username CHR wajib diisi sebelum test koneksi.');
        }

        if ($probe['password'] === '') {
            return back()->with('error', 'Password CHR belum ada. Isi password lalu test, atau simpan dulu.');
        }

        config(['chr' => $probe]);

        try {
            $identity = $client->identity();
            $resource = $client->resource();
            $client->disconnect();
        } catch (Throwable $e) {
            try {
                $client->disconnect();
            } catch (Throwable) {
                //
            }

            return back()->with('error', 'Koneksi CHR gagal: '.$e->getMessage());
        }

        $name = $identity['name'] ?? 'CHR';
        $version = $resource['version'] ?? '—';
        $uptime = $resource['uptime'] ?? '—';
        $board = $resource['board_name'] ?? null;
        $cpu = $resource['cpu_load'] ?? null;

        $detail = "Terhubung ke {$name} via API {$probe['host']}:{$probe['port']}";
        $detail .= " · RouterOS {$version} · uptime {$uptime}";
        if ($board) {
            $detail .= " · {$board}";
        }
        if ($cpu !== null && $cpu !== '') {
            $detail .= " · CPU {$cpu}%";
        }

        return back()->with('success', $detail);
    }

    public function storePlan(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'duration_days' => ['required', 'integer', 'min:1', 'max:3650'],
            'price' => ['nullable', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
        ]);

        SubscriptionPlan::query()->create([
            'name' => $data['name'],
            'slug' => Str::slug($data['name']).'-'.$data['duration_days'],
            'duration_days' => $data['duration_days'],
            'price' => $data['price'] ?? 0,
            'description' => $data['description'] ?? null,
            'sort_order' => (int) SubscriptionPlan::query()->max('sort_order') + 1,
        ]);

        return back()->with('success', 'Paket langganan ditambahkan.');
    }

    public function destroyPlan(SubscriptionPlan $plan): RedirectResponse
    {
        $plan->delete();

        return back()->with('success', 'Paket dihapus.');
    }
}
