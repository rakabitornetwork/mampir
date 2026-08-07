<?php

namespace App\Http\Controllers;

use App\Services\GitUpdateService;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class UpdateController extends Controller
{
    public function index(GitUpdateService $git): Response
    {
        return Inertia::render('Update/Index', [
            'git' => $git->status(),
        ]);
    }

    public function check(GitUpdateService $git): RedirectResponse
    {
        try {
            $result = $git->check();
        } catch (Throwable $e) {
            return back()->with('error', 'Cek update gagal: '.$e->getMessage());
        }

        if ($result['behind'] > 0) {
            return back()->with(
                'warning',
                "Ada {$result['behind']} commit baru di {$result['upstream']}".
                ($result['remote_commit'] ? " ({$result['remote_commit']}: {$result['remote_subject']})" : '').
                '. Klik Pull untuk menerapkan.'
            );
        }

        if ($result['ahead'] > 0) {
            return back()->with(
                'warning',
                "Lokal lebih maju {$result['ahead']} commit dari {$result['upstream']}. Push dulu dari mesin development."
            );
        }

        return back()->with('success', 'Sudah up to date dengan '.$result['upstream'].'.');
    }

    public function pull(GitUpdateService $git): RedirectResponse
    {
        try {
            $result = $git->pull();
        } catch (Throwable $e) {
            return back()->with('error', 'Pull update gagal: '.$e->getMessage());
        }

        $failedSteps = collect($result['steps'] ?? [])
            ->filter(fn (array $step) => ! ($step['ok'] ?? false))
            ->pluck('name')
            ->all();

        if ($failedSteps !== []) {
            return back()->with(
                'warning',
                $result['message'].' Namun langkah gagal: '.implode(', ', $failedSteps).'.'
            );
        }

        if ($result['already_up_to_date'] ?? false) {
            return back()->with('success', $result['message']);
        }

        return back()->with('success', $result['message']);
    }
}
