import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    CloudDownload,
    GitBranch,
    GitCommitHorizontal,
    RefreshCw,
    Search,
} from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge, Button, Panel, StatCard } from '@/Components/UI';
import { formatDate } from '@/lib/utils';

export default function UpdateIndex({ git }) {
    const [checking, setChecking] = useState(false);
    const [pulling, setPulling] = useState(false);
    const busy = checking || pulling;

    const checkUpdate = () => {
        router.post(
            '/update/check',
            {},
            {
                preserveScroll: true,
                onStart: () => setChecking(true),
                onFinish: () => setChecking(false),
            }
        );
    };

    const pullUpdate = () => {
        router.post(
            '/update/pull',
            {},
            {
                preserveScroll: true,
                onStart: () => setPulling(true),
                onFinish: () => setPulling(false),
            }
        );
    };

    return (
        <AdminLayout
            title="Update Aplikasi"
            subtitle="Tarik perubahan terbaru dari GitHub ke server Laragon ini."
        >
            <Head title="Update Aplikasi" />

            {!git?.available && (
                <div className="mb-6 rounded-2xl border border-rose/20 bg-rose/10 px-4 py-3 text-sm text-rose">
                    Git tidak siap: {git?.error || 'unknown'}
                </div>
            )}

            {git?.available && (
                <>
                    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label="Branch"
                            value={git.branch || '—'}
                            icon={GitBranch}
                            tone="ink"
                            hint={git.upstream ? `track ${git.upstream}` : `target ${git.remote}/${git.configured_branch}`}
                        />
                        <StatCard
                            label="Commit lokal"
                            value={git.commit || '—'}
                            icon={GitCommitHorizontal}
                            tone="teal"
                            hint={git.subject}
                        />
                        <StatCard
                            label="Tertinggal"
                            value={String(git.behind ?? 0)}
                            tone={git.behind > 0 ? 'amber' : 'sky'}
                            hint={git.ahead > 0 ? `lokal +${git.ahead} commit` : 'vs remote terakhir diketahui'}
                        />
                        <StatCard
                            label="Working tree"
                            value={git.dirty ? `${git.dirty_count} berubah` : 'Bersih'}
                            tone={git.dirty ? 'rose' : 'teal'}
                            hint={git.author ? `oleh ${git.author}` : undefined}
                        />
                    </div>

                    <div className="mb-6 flex flex-wrap gap-3">
                        <Button variant="soft" disabled={busy} onClick={checkUpdate}>
                            <Search className={`h-4 w-4 ${checking ? 'animate-pulse' : ''}`} />
                            {checking ? 'Mengecek…' : 'Cek update'}
                        </Button>
                        <Button
                            variant="teal"
                            disabled={busy || !git.available || git.dirty}
                            onClick={pullUpdate}
                            title={git.dirty ? 'Bersihkan working tree dulu sebelum pull' : undefined}
                        >
                            <CloudDownload className={`h-4 w-4 ${pulling ? 'animate-bounce' : ''}`} />
                            {pulling ? 'Menarik update…' : 'Pull dari GitHub'}
                        </Button>
                        <Button
                            variant="ghost"
                            disabled={busy}
                            onClick={() => router.reload({ preserveScroll: true })}
                        >
                            <RefreshCw className="h-4 w-4" />
                            Muat ulang status
                        </Button>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-2">
                        <Panel title="Detail repository">
                            <dl className="space-y-3 text-sm">
                                {[
                                    ['Remote URL', git.remote_url || '—'],
                                    ['Remote', git.remote],
                                    ['Branch target', git.configured_branch],
                                    ['Commit penuh', git.full_commit],
                                    ['Pesan commit', git.subject],
                                    ['Waktu commit', git.committed_at ? formatDate(git.committed_at) : '—'],
                                    ['Path', git.base_path],
                                ].map(([k, v]) => (
                                    <div key={k} className="flex justify-between gap-4 border-b border-ink/6 pb-2">
                                        <dt className="shrink-0 text-ink-soft/70">{k}</dt>
                                        <dd className="break-all text-right font-mono text-ink">{v}</dd>
                                    </div>
                                ))}
                            </dl>

                            <div className="mt-5 flex flex-wrap gap-2">
                                <Badge status={git.behind > 0 ? 'expired' : 'active'}>
                                    {git.behind > 0 ? `${git.behind} di belakang` : 'sinkron'}
                                </Badge>
                                {git.ahead > 0 && (
                                    <Badge status="pending">{git.ahead} di depan</Badge>
                                )}
                                <Badge status={git.dirty ? 'expired' : 'active'}>
                                    {git.dirty ? 'dirty' : 'clean'}
                                </Badge>
                            </div>
                        </Panel>

                        <Panel title="Langkah setelah pull">
                            <ul className="space-y-2 text-sm text-ink-soft">
                                <li className="flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                                    <span>
                                        <code className="font-mono text-ink">git fetch</code> +{' '}
                                        <code className="font-mono text-ink">git pull --ff-only</code> dari{' '}
                                        {git.remote}/{git.configured_branch}
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                                    <span>
                                        Composer install:{' '}
                                        <strong className="text-ink">
                                            {git.options?.run_composer ? 'aktif' : 'nonaktif'}
                                        </strong>
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                                    <span>
                                        Migrasi database:{' '}
                                        <strong className="text-ink">
                                            {git.options?.run_migrate ? 'aktif' : 'nonaktif'}
                                        </strong>
                                    </span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                                    <span>
                                        Optimize clear:{' '}
                                        <strong className="text-ink">
                                            {git.options?.run_optimize_clear ? 'aktif' : 'nonaktif'}
                                        </strong>
                                    </span>
                                </li>
                            </ul>
                            <p className="mt-4 text-xs text-ink-soft/70">
                                Ubah lewat <code className="font-mono">.env</code>: UPDATE_RUN_COMPOSER,
                                UPDATE_RUN_MIGRATE, UPDATE_RUN_OPTIMIZE_CLEAR, UPDATE_GIT_BRANCH.
                            </p>
                        </Panel>
                    </div>

                    {git.dirty && (
                        <Panel className="mt-6" title="File lokal yang berubah">
                            <div className="space-y-1 font-mono text-xs text-ink-soft">
                                {git.dirty_files.map((line) => (
                                    <div key={line} className="rounded-lg bg-ink/[0.03] px-3 py-1.5">
                                        {line}
                                    </div>
                                ))}
                                {git.dirty_count > git.dirty_files.length && (
                                    <p className="pt-2 text-ink-soft/60">
                                        …dan {git.dirty_count - git.dirty_files.length} file lainnya
                                    </p>
                                )}
                            </div>
                        </Panel>
                    )}

                    <Panel className="mt-6" title="Cara pakai">
                        <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-soft">
                            <li>
                                Push perubahan dari mesin development ke{' '}
                                <span className="font-mono text-ink">{git.remote_url || 'GitHub'}</span>.
                            </li>
                            <li>
                                Di server ini, klik <strong className="text-ink">Cek update</strong> untuk
                                melihat apakah remote punya commit baru.
                            </li>
                            <li>
                                Klik <strong className="text-ink">Pull dari GitHub</strong> — hanya
                                fast-forward; working tree harus bersih.
                            </li>
                            <li>
                                Jika frontend berubah, jalankan{' '}
                                <span className="font-mono text-ink">npm run build</span> di terminal
                                (belum dijalankan otomatis dari halaman ini).
                            </li>
                        </ol>
                    </Panel>
                </>
            )}
        </AdminLayout>
    );
}
