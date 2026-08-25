import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import {
    AlertTriangle,
    CloudDownload,
    GitBranch,
    GitCommitHorizontal,
    RefreshCw,
    Search,
    Trash2,
} from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge, Button, Panel, StatCard } from '@/Components/UI';
import { formatDate } from '@/lib/utils';

export default function UpdateIndex({ git }) {
    const [checking, setChecking] = useState(false);
    const [pulling, setPulling] = useState(false);
    const [resetting, setResetting] = useState(false);
    const busy = checking || pulling || resetting;

    const checkUpdate = () => {
        router.post('/update/check', {}, {
            preserveScroll: true,
            onStart: () => setChecking(true),
            onFinish: () => setChecking(false),
        });
    };

    const pullUpdate = () => {
        router.post('/update/pull', {}, {
            preserveScroll: true,
            onStart: () => setPulling(true),
            onFinish: () => setPulling(false),
        });
    };

    const resetAndPull = () => {
        const ok = confirm(
            'Ini akan MEMBUANG semua perubahan lokal di server (git reset --hard + clean), lalu pull dari GitHub.\n\nFile .env tidak ikut terhapus.\n\nLanjutkan?'
        );
        if (!ok) return;

        router.post('/update/reset-pull', {}, {
            preserveScroll: true,
            onStart: () => setResetting(true),
            onFinish: () => setResetting(false),
        });
    };

    const summary = git?.dirty_summary || {};

    return (
        <AdminLayout
            title="Update aplikasi"
            subtitle="Cek dulu, lalu pull. Reset hanya jika working tree kotor menghalangi update."
            crumbs={[{ label: 'Update' }]}
        >
            <Head title="Update Aplikasi" />

            {!git?.available && (
                <div className="mb-6 rounded-2xl border border-rose/20 bg-rose/8 px-4 py-3 text-sm text-rose">
                    Git tidak siap: {git?.error || 'unknown'}
                </div>
            )}

            {git?.available && (
                <>
                    {git.dirty && (
                        <div className="mb-6 rounded-2xl border border-amber/25 bg-amber/8 px-4 py-3 text-sm text-amber">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                                <div>
                                    <strong className="text-ink">Working tree berubah</strong> memblokir pull biasa.
                                    Biasanya file hasil composer/npm atau permission — bukan error aplikasi.
                                    {git.behind > 0 && (
                                        <> Ada <strong>{git.behind}</strong> commit baru di GitHub.</>
                                    )}
                                    {git.options?.allow_reset && <> Pakai Reset & Pull untuk membersihkan lalu update.</>}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="mb-6 grid gap-3 sm:grid-cols-3">
                        {[
                            { n: '1', title: 'Cek update', text: 'Bandingkan commit lokal dengan GitHub.' },
                            { n: '2', title: 'Pull', text: 'Ambil commit baru jika working tree bersih.' },
                            { n: '3', title: 'Reset & pull', text: 'Hanya jika file lokal menghalangi.' },
                        ].map((item) => (
                            <div key={item.n} className="surface rounded-2xl px-4 py-3">
                                <div className="font-mono text-[10px] text-gold">{item.n}</div>
                                <div className="mt-1 text-sm font-semibold text-ink">{item.title}</div>
                                <p className="mt-0.5 text-xs text-ink-soft/70">{item.text}</p>
                            </div>
                        ))}
                    </div>

                    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <StatCard
                            label="Branch"
                            value={git.branch || '—'}
                            icon={GitBranch}
                            tone="ink"
                            hint={git.upstream ? `track ${git.upstream}` : `target ${git.remote}/${git.configured_branch}`}
                        />
                        <StatCard label="Commit lokal" value={git.commit || '—'} icon={GitCommitHorizontal} tone="teal" hint={git.subject} />
                        <StatCard
                            label="Tertinggal"
                            value={String(git.behind ?? 0)}
                            tone={git.behind > 0 ? 'amber' : 'sky'}
                            hint={git.ahead > 0 ? `lokal +${git.ahead} commit` : 'commit baru di GitHub belum di-pull'}
                        />
                        <StatCard
                            label="Working tree"
                            value={git.dirty ? `${git.dirty_count} berubah` : 'Bersih'}
                            tone={git.dirty ? 'rose' : 'teal'}
                            hint={git.dirty ? 'blokir pull biasa' : 'siap pull'}
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
                        {git.options?.allow_reset && git.dirty && (
                            <Button variant="danger" disabled={busy} onClick={resetAndPull}>
                                <Trash2 className={`h-4 w-4 ${resetting ? 'animate-pulse' : ''}`} />
                                {resetting ? 'Reset & pull…' : 'Reset & Pull'}
                            </Button>
                        )}
                        <Button variant="ghost" disabled={busy} onClick={() => router.reload({ preserveScroll: true })}>
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
                                {git.ahead > 0 && <Badge status="pending">{git.ahead} di depan</Badge>}
                                <Badge status={git.dirty ? 'dirty' : 'clean'}>{git.dirty ? 'berubah' : 'bersih'}</Badge>
                            </div>
                        </Panel>

                        <Panel title="Yang dijalankan setelah pull">
                            <ul className="space-y-2 text-sm text-ink-soft">
                                {[
                                    <>git fetch + git pull --ff-only dari {git.remote}/{git.configured_branch}</>,
                                    <>Composer install: <strong className="text-ink">{git.options?.run_composer ? 'aktif' : 'nonaktif'}</strong></>,
                                    <>Migrasi database: <strong className="text-ink">{git.options?.run_migrate ? 'aktif' : 'nonaktif'}</strong></>,
                                    <>Optimize clear: <strong className="text-ink">{git.options?.run_optimize_clear ? 'aktif' : 'nonaktif'}</strong></>,
                                    <>
                                        npm run build di server:{' '}
                                        <strong className="text-ink">
                                            {git.options?.run_npm_build ? 'aktif' : 'nonaktif — pakai public/build dari GitHub'}
                                        </strong>
                                    </>,
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </Panel>
                    </div>

                    {git.dirty && (
                        <Panel className="mt-6" title="File lokal yang berubah">
                            {(summary.vendor > 0 ||
                                summary.node_modules > 0 ||
                                summary.public_build > 0 ||
                                summary.storage > 0) && (
                                <div className="mb-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                                    {[
                                        ['vendor/', summary.vendor],
                                        ['node_modules/', summary.node_modules],
                                        ['public/build/', summary.public_build],
                                        ['storage/', summary.storage],
                                        ['lainnya', summary.other],
                                    ]
                                        .filter(([, n]) => n > 0)
                                        .map(([label, n]) => (
                                            <div key={label} className="rounded-lg border border-ink/8 bg-white/60 px-3 py-2">
                                                <div className="text-ink-soft/70">{label}</div>
                                                <div className="font-mono text-ink">{n} file</div>
                                            </div>
                                        ))}
                                </div>
                            )}
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

                    <Panel className="mt-6" title="Arti status">
                        <ul className="list-disc space-y-2 pl-5 text-sm text-ink-soft">
                            <li>
                                <strong className="text-ink">N di belakang</strong> — ada N commit di GitHub yang belum di-pull. Itu info, bukan error.
                            </li>
                            <li>
                                <strong className="text-ink">Berubah / dirty</strong> — ada file lokal berbeda dari commit. Pull biasa ditolak agar tidak tertimpa.
                            </li>
                            <li>
                                Frontend di-build di mesin development (`npm run build`), lalu folder{' '}
                                <code className="font-mono text-ink">public/build</code> di-commit. VPS tidak perlu Node/npm.
                            </li>
                            <li>
                                Di VPS, pakai <strong className="text-ink">Reset & Pull</strong>. Atau via SSH:
                                <pre className="mt-2 overflow-x-auto rounded-xl bg-ink px-3 py-2 font-mono text-xs text-mist">
                                    {`cd ${git.base_path || '/home/mampir/public_html'}
git config core.filemode false
git reset --hard HEAD
git clean -fd -e public/build -e vendor -e storage -e bootstrap/cache
git pull --ff-only origin main
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize:clear`}
                                </pre>
                            </li>
                        </ul>
                    </Panel>
                </>
            )}
        </AdminLayout>
    );
}
