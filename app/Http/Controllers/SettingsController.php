<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use App\Services\ChrSettingsService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

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
