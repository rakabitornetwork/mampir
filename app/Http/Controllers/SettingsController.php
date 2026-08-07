<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionPlan;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('Settings/Index', [
            'plans' => SubscriptionPlan::query()->orderBy('sort_order')->get(),
            'chr' => [
                'host' => config('chr.host'),
                'port' => config('chr.port'),
                'username' => config('chr.username'),
                'public_ip' => config('chr.public_ip'),
                'tunnel_gateway' => config('chr.tunnel_gateway'),
                'tunnel_network' => config('chr.tunnel_network'),
                'port_block_start' => config('chr.port_block_start'),
                'port_block_end' => config('chr.port_block_end'),
                'port_block_step' => config('chr.port_block_step'),
                'service_templates' => config('chr.service_templates'),
            ],
        ]);
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
