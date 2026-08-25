import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import { CloudDownload, Search } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge, Button, ConfirmDialog, Panel } from '@/Components/UI';
import { formatDate } from '@/lib/utils';

export default function UpdateIndex({ git }) {
    const [checking, setChecking] = useState(false);
    const [pulling, setPulling] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [showFiles, setShowFiles] = useState(false);
    const busy = checking || pulling || resetting;

    const behind = git?.behind ?? 0;
    const dirty = Boolean(git?.dirty);
    const upToDate = git?.available && !dirty && behind === 0;

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
        setConfirmReset(false);
        router.post('/update/reset-pull', {}, {
            preserveScroll: true,
            onStart: () => setResetting(true),
            onFinish: () => setResetting(false),
        });
    };

    return (
        <AdminLayout
            title="Update"
            subtitle="Cek versi di GitHub, lalu terapkan jika ada rilis baru."
            crumbs={[{ label: 'Update' }]}
        >
            <Head title="Update" />

            {!git?.available && (
                <Panel>
                    <p className="text-sm text-rose">Git tidak siap: {git?.error || 'unknown'}</p>
                </Panel>
            )}

            {git?.available && (
                <Panel>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                {upToDate && <Badge status="active">Terbaru</Badge>}
                                {behind > 0 && <Badge status="pending">{behind} update tersedia</Badge>}
                                {dirty && <Badge status="warning">Perubahan lokal</Badge>}
                            </div>
                            <div className="mt-3 text-lg font-semibold tracking-tight text-ink">
                                {git.subject || 'Commit lokal'}
                            </div>
                            <p className="mt-1 font-mono text-sm text-ink-soft">
                                {git.branch} · {git.commit}
                                {git.committed_at ? ` · ${formatDate(git.committed_at)}` : ''}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <Button variant="soft" disabled={busy} onClick={checkUpdate}>
                                <Search className={`h-4 w-4 ${checking ? 'animate-pulse' : ''}`} />
                                {checking ? 'Mengecek…' : 'Cek update'}
                            </Button>
                            {!dirty && (
                                <Button variant="teal" disabled={busy || behind === 0} onClick={pullUpdate}>
                                    <CloudDownload className={`h-4 w-4 ${pulling ? 'animate-bounce' : ''}`} />
                                    {pulling ? 'Mengupdate…' : behind > 0 ? 'Update sekarang' : 'Sudah terbaru'}
                                </Button>
                            )}
                            {dirty && git.options?.allow_reset && (
                                <Button variant="danger" disabled={busy} onClick={() => setConfirmReset(true)}>
                                    {resetting ? 'Membersihkan…' : 'Reset & update'}
                                </Button>
                            )}
                        </div>
                    </div>

                    {dirty && (
                        <div className="mt-6 rounded-2xl border border-amber/20 bg-amber/8 px-4 py-3 text-sm text-ink">
                            Ada {git.dirty_count} file lokal yang berbeda dari GitHub, jadi pull biasa ditahan.
                            {behind > 0 && <> Ada juga {behind} commit baru yang menunggu.</>}
                            {git.options?.allow_reset && (
                                <> Reset membuang perubahan lokal (.env aman), lalu menarik versi terbaru.</>
                            )}
                            {git.dirty_files?.length > 0 && (
                                <button
                                    type="button"
                                    className="mt-2 block text-xs font-medium text-amber"
                                    onClick={() => setShowFiles((v) => !v)}
                                >
                                    {showFiles ? 'Sembunyikan file' : 'Lihat file yang berubah'}
                                </button>
                            )}
                            {showFiles && (
                                <div className="mt-3 max-h-48 space-y-1 overflow-auto font-mono text-xs text-ink-soft">
                                    {git.dirty_files.map((line) => (
                                        <div key={line}>{line}</div>
                                    ))}
                                    {git.dirty_count > git.dirty_files.length && (
                                        <div>…dan {git.dirty_count - git.dirty_files.length} file lainnya</div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </Panel>
            )}

            <ConfirmDialog
                open={confirmReset}
                title="Reset lalu update?"
                body="Perubahan lokal di server akan dibuang, lalu versi terbaru ditarik dari GitHub. File .env tidak dihapus."
                confirmLabel="Reset & update"
                variant="danger"
                onCancel={() => setConfirmReset(false)}
                onConfirm={resetAndPull}
            />
        </AdminLayout>
    );
}
