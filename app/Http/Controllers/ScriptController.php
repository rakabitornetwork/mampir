<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Services\MikroTik\ScriptGenerator;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ScriptController extends Controller
{
    public function index(Request $request, ScriptGenerator $generator): Response
    {
        $customerId = $request->integer('customer_id') ?: null;
        $customers = Customer::query()
            ->with('tunnel')
            ->orderBy('name')
            ->get()
            ->map(fn (Customer $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'username' => $c->username,
                'status' => $c->status,
                'has_tunnel' => (bool) $c->tunnel,
            ]);

        $selected = $customerId
            ? Customer::query()->with('tunnel.portForwards')->find($customerId)
            : null;

        return Inertia::render('Scripts/Index', [
            'customers' => $customers,
            'selectedId' => $selected?->id,
            'scripts' => $selected ? [
                'server' => $generator->serverScript($selected),
                'client' => $generator->clientScript($selected),
                'disable' => $generator->disableScript($selected),
            ] : null,
            'customer' => $selected ? [
                'id' => $selected->id,
                'name' => $selected->name,
                'username' => $selected->username,
            ] : null,
        ]);
    }

    public function download(Customer $customer, string $type, ScriptGenerator $generator): StreamedResponse
    {
        $map = [
            'server' => [$generator->serverScript($customer), "mampir-server-{$customer->username}.rsc"],
            'client' => [$generator->clientScript($customer), "mampir-client-{$customer->username}.rsc"],
            'disable' => [$generator->disableScript($customer), "mampir-disable-{$customer->username}.rsc"],
        ];

        abort_unless(isset($map[$type]), 404);

        [$content, $filename] = $map[$type];

        return response()->streamDownload(function () use ($content) {
            echo $content;
        }, $filename, [
            'Content-Type' => 'text/plain; charset=UTF-8',
        ]);
    }
}
