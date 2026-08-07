import { Head, router } from '@inertiajs/react';
import { RefreshCw, Server, TimerReset } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge, Button, Panel, StatCard } from '@/Components/UI';
import { formatDate } from '@/lib/utils';

export default function SyncIndex({ logs, chrInfo, error }) {
    return (
        <AdminLayout
            title="Sinkron CHR"
            subtitle="Tarik pelanggan aktif dari MikroTik CHR (API 8728) agar muncul di panel Mampir."
        >
            <Head title="Sinkron CHR" />

            {error && (
                <div className="mb-6 rounded-2xl border border-rose/20 bg-rose/10 px-4 py-3 text-sm text-rose">
                    Koneksi CHR: {error}
                </div>
            )}

            {chrInfo && (
                <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard label="Identity" value={chrInfo.identity || '—'} icon={Server} tone="ink" />
                    <StatCard label="RouterOS" value={chrInfo.version || '—'} tone="teal" hint={chrInfo.board_name} />
                    <StatCard label="Uptime" value={chrInfo.uptime || '—'} tone="sky" />
                    <StatCard label="CPU" value={chrInfo.cpu_load || '—'} tone="amber" hint={chrInfo.public_ip} />
                </div>
            )}

            <div className="mb-6 flex flex-wrap gap-3">
                <Button variant="teal" onClick={() => router.post('/sync/pull')}>
                    <RefreshCw className="h-4 w-4" />
                    Pull dari CHR sekarang
                </Button>
                <Button variant="soft" onClick={() => router.post('/sync/expire')}>
                    <TimerReset className="h-4 w-4" />
                    Proses expiry sekarang
                </Button>
            </div>

            <Panel title="Cara pelanggan CHR muncul di aplikasi">
                <ol className="list-decimal space-y-2 pl-5 text-sm text-ink-soft">
                    <li>
                        Klik <strong className="text-ink">Pull dari CHR</strong> — aplikasi membaca{' '}
                        <span className="font-mono text-ink">/ppp secret</span>,{' '}
                        <span className="font-mono text-ink">/ppp active</span>, dan{' '}
                        <span className="font-mono text-ink">/ip firewall nat</span>.
                    </li>
                    <li>
                        Setiap secret L2TP di-upsert jadi pelanggan + tunnel + port forward (matching by username / remote IP).
                    </li>
                    <li>
                        Status online diambil dari sesi PPP aktif. Scheduler juga menjalankan sync tiap 5 menit.
                    </li>
                    <li>
                        Setelah sync, set masa aktif per pelanggan lewat halaman detail (paket berbeda-beda: 7/30/90/365 hari atau custom).
                    </li>
                </ol>
            </Panel>

            <Panel className="mt-6" title="Log sinkronisasi">
                <div className="space-y-3">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/8 bg-white/60 px-4 py-3 text-sm"
                        >
                            <div>
                                <div className="flex items-center gap-2">
                                    <Badge status={log.status === 'success' ? 'active' : 'expired'}>{log.status}</Badge>
                                    <span className="uppercase tracking-wide text-ink-soft/60">{log.type}</span>
                                </div>
                                <div className="mt-1 text-ink">{log.message}</div>
                                <div className="mt-0.5 text-xs text-ink-soft/60">
                                    {log.customers_synced} pelanggan · {log.ports_synced} port · {formatDate(log.created_at)}
                                </div>
                            </div>
                        </div>
                    ))}
                    {logs.length === 0 && <p className="text-sm text-ink-soft/70">Belum ada log.</p>}
                </div>
            </Panel>
        </AdminLayout>
    );
}
