<?php

namespace App\Services;

use Illuminate\Support\Facades\Process;
use RuntimeException;
use Throwable;

class GitUpdateService
{
    public function status(): array
    {
        $base = $this->basePath();

        if (! is_dir($base.DIRECTORY_SEPARATOR.'.git')) {
            return [
                'available' => false,
                'error' => 'Direktori aplikasi bukan repository git.',
            ];
        }

        try {
            $branch = $this->gitOutput(['rev-parse', '--abbrev-ref', 'HEAD']);
            $commit = $this->gitOutput(['rev-parse', '--short', 'HEAD']);
            $fullCommit = $this->gitOutput(['rev-parse', 'HEAD']);
            $subject = $this->gitOutput(['log', '-1', '--pretty=%s']);
            $author = $this->gitOutput(['log', '-1', '--pretty=%an']);
            $committedAt = $this->gitOutput(['log', '-1', '--pretty=%cI']);
            $remoteUrl = $this->remoteUrl();
            $dirty = $this->dirtyFiles();
            $tracking = $this->trackingInfo($branch);

            return [
                'available' => true,
                'error' => null,
                'base_path' => $base,
                'branch' => $branch,
                'remote' => config('update.remote', 'origin'),
                'configured_branch' => config('update.branch', 'main'),
                'commit' => $commit,
                'full_commit' => $fullCommit,
                'subject' => $subject,
                'author' => $author,
                'committed_at' => $committedAt !== '' ? $committedAt : null,
                'remote_url' => $remoteUrl,
                'dirty' => count($dirty) > 0,
                'dirty_files' => array_slice($dirty, 0, 20),
                'dirty_count' => count($dirty),
                'ahead' => $tracking['ahead'],
                'behind' => $tracking['behind'],
                'upstream' => $tracking['upstream'],
                'options' => [
                    'run_composer' => (bool) config('update.run_composer'),
                    'run_migrate' => (bool) config('update.run_migrate'),
                    'run_optimize_clear' => (bool) config('update.run_optimize_clear'),
                ],
            ];
        } catch (Throwable $e) {
            return [
                'available' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Fetch remote dan hitung ahead/behind tanpa mengubah working tree.
     *
     * @return array{ahead:int, behind:int, upstream:?string, remote_commit:?string, remote_subject:?string}
     */
    public function check(): array
    {
        $remote = config('update.remote', 'origin');
        $branch = config('update.branch', 'main');

        $fetch = $this->git(['fetch', $remote, $branch]);
        if ($fetch['failed']) {
            throw new RuntimeException('Gagal fetch dari GitHub: '.$fetch['error']);
        }

        $upstream = $remote.'/'.$branch;
        $counts = $this->aheadBehind($upstream);
        $remoteCommit = null;
        $remoteSubject = null;

        try {
            $remoteCommit = $this->gitOutput(['rev-parse', '--short', $upstream]);
            $remoteSubject = $this->gitOutput(['log', '-1', '--pretty=%s', $upstream]);
        } catch (Throwable) {
            // upstream belum ada setelah fetch gagal sebagian
        }

        return [
            'ahead' => $counts['ahead'],
            'behind' => $counts['behind'],
            'upstream' => $upstream,
            'remote_commit' => $remoteCommit,
            'remote_subject' => $remoteSubject,
            'output' => $fetch['output'],
        ];
    }

    /**
     * Pull update dari GitHub (fast-forward only), lalu jalankan langkah pasca-update.
     *
     * @return array{pulled:bool, already_up_to_date:bool, commit:?string, subject:?string, steps:list<array{name:string, ok:bool, output:string}>, message:string}
     */
    public function pull(): array
    {
        $status = $this->status();
        if (! ($status['available'] ?? false)) {
            throw new RuntimeException($status['error'] ?? 'Git tidak tersedia.');
        }

        if ($status['dirty']) {
            throw new RuntimeException(
                'Working tree kotor ('.$status['dirty_count'].' file berubah). Commit/stash dulu sebelum pull.'
            );
        }

        $remote = config('update.remote', 'origin');
        $branch = config('update.branch', 'main');
        $steps = [];

        $fetch = $this->git(['fetch', $remote, $branch]);
        $steps[] = ['name' => 'git fetch', 'ok' => ! $fetch['failed'], 'output' => $fetch['output']];
        if ($fetch['failed']) {
            throw new RuntimeException('Gagal fetch: '.$fetch['error']);
        }

        $upstream = $remote.'/'.$branch;
        $counts = $this->aheadBehind($upstream);

        if ($counts['behind'] === 0 && $counts['ahead'] === 0) {
            return [
                'pulled' => false,
                'already_up_to_date' => true,
                'commit' => $status['commit'],
                'subject' => $status['subject'],
                'steps' => $steps,
                'message' => 'Sudah up to date dengan '.$upstream.'.',
            ];
        }

        if ($counts['ahead'] > 0) {
            throw new RuntimeException(
                "Branch lokal lebih maju {$counts['ahead']} commit dari {$upstream}. Push dulu atau reset manual — pull ff-only dibatalkan."
            );
        }

        $before = $this->gitOutput(['rev-parse', 'HEAD']);
        $pull = $this->git(['pull', '--ff-only', $remote, $branch]);
        $steps[] = ['name' => 'git pull --ff-only', 'ok' => ! $pull['failed'], 'output' => $pull['output']];
        if ($pull['failed']) {
            throw new RuntimeException('Gagal pull: '.$pull['error']);
        }

        $after = $this->gitOutput(['rev-parse', 'HEAD']);
        $pulled = $before !== $after;

        if ($pulled && config('update.run_composer')) {
            $steps[] = $this->runComposer();
        }

        if ($pulled && config('update.run_migrate')) {
            $steps[] = $this->runArtisan(['migrate', '--force']);
        }

        if ($pulled && config('update.run_optimize_clear')) {
            $steps[] = $this->runArtisan(['optimize:clear']);
        }

        $commit = $this->gitOutput(['rev-parse', '--short', 'HEAD']);
        $subject = $this->gitOutput(['log', '-1', '--pretty=%s']);

        return [
            'pulled' => $pulled,
            'already_up_to_date' => ! $pulled,
            'commit' => $commit,
            'subject' => $subject,
            'steps' => $steps,
            'message' => $pulled
                ? "Update berhasil ke {$commit}: {$subject}"
                : 'Sudah up to date.',
        ];
    }

    protected function basePath(): string
    {
        return base_path();
    }

    /** Path aman untuk opsi git safe.directory (forward slash). */
    protected function safeDirectory(): string
    {
        return str_replace('\\', '/', $this->basePath());
    }

    /**
     * @param  list<string>  $args
     * @return array{failed:bool, output:string, error:string, exit_code:int}
     */
    protected function git(array $args): array
    {
        $command = array_merge(
            ['git', '-c', 'safe.directory='.$this->safeDirectory()],
            $args
        );

        $result = Process::path($this->basePath())
            ->timeout(180)
            ->run($command);

        $output = trim($result->output()."\n".$result->errorOutput());

        return [
            'failed' => $result->failed(),
            'output' => $output,
            'error' => $result->failed() ? ($output !== '' ? $output : 'exit '.$result->exitCode()) : '',
            'exit_code' => $result->exitCode() ?? 1,
        ];
    }

    /**
     * @param  list<string>  $args
     */
    protected function gitOutput(array $args): string
    {
        $result = $this->git($args);
        if ($result['failed']) {
            throw new RuntimeException($result['error'] !== '' ? $result['error'] : 'Perintah git gagal.');
        }

        return trim($result['output']);
    }

    protected function remoteUrl(): ?string
    {
        $remote = config('update.remote', 'origin');

        try {
            return $this->gitOutput(['remote', 'get-url', $remote]) ?: null;
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * @return list<string>
     */
    protected function dirtyFiles(): array
    {
        $porcelain = $this->gitOutput(['status', '--porcelain']);
        if ($porcelain === '') {
            return [];
        }

        return array_values(array_filter(array_map('trim', preg_split('/\r\n|\r|\n/', $porcelain) ?: [])));
    }

    /**
     * @return array{ahead:int, behind:int, upstream:?string}
     */
    protected function trackingInfo(string $branch): array
    {
        $remote = config('update.remote', 'origin');
        $configured = config('update.branch', 'main');
        $upstream = $remote.'/'.$configured;

        $exists = $this->git(['rev-parse', '--verify', $upstream]);
        if ($exists['failed']) {
            return ['ahead' => 0, 'behind' => 0, 'upstream' => null];
        }

        $counts = $this->aheadBehind($upstream);

        return [
            'ahead' => $counts['ahead'],
            'behind' => $counts['behind'],
            'upstream' => $upstream,
        ];
    }

    /**
     * @return array{ahead:int, behind:int}
     */
    protected function aheadBehind(string $upstream): array
    {
        try {
            $raw = $this->gitOutput(['rev-list', '--left-right', '--count', 'HEAD...'.$upstream]);
        } catch (Throwable) {
            return ['ahead' => 0, 'behind' => 0];
        }

        $parts = preg_split('/\s+/', trim($raw)) ?: [];

        return [
            'ahead' => (int) ($parts[0] ?? 0),
            'behind' => (int) ($parts[1] ?? 0),
        ];
    }

    /**
     * @return array{name:string, ok:bool, output:string}
     */
    protected function runComposer(): array
    {
        $lock = $this->basePath().DIRECTORY_SEPARATOR.'composer.lock';
        $args = file_exists($lock)
            ? ['composer', 'install', '--no-interaction', '--prefer-dist']
            : ['composer', 'update', '--no-interaction', '--prefer-dist'];

        // Di production biasanya --no-dev; lokal Laragon biarkan sesuai APP_ENV.
        if (app()->environment('production')) {
            $args[] = '--no-dev';
            $args[] = '--optimize-autoloader';
        }

        $result = Process::path($this->basePath())
            ->timeout(600)
            ->run($args);

        $output = trim($result->output()."\n".$result->errorOutput());

        return [
            'name' => implode(' ', $args),
            'ok' => ! $result->failed(),
            'output' => $output !== '' ? $output : ($result->failed() ? 'composer gagal' : 'ok'),
        ];
    }

    /**
     * @param  list<string>  $artisanArgs
     * @return array{name:string, ok:bool, output:string}
     */
    protected function runArtisan(array $artisanArgs): array
    {
        $command = array_merge([PHP_BINARY, 'artisan'], $artisanArgs);

        $result = Process::path($this->basePath())
            ->timeout(300)
            ->run($command);

        $output = trim($result->output()."\n".$result->errorOutput());

        return [
            'name' => 'php artisan '.implode(' ', $artisanArgs),
            'ok' => ! $result->failed(),
            'output' => $output !== '' ? $output : ($result->failed() ? 'artisan gagal' : 'ok'),
        ];
    }
}
