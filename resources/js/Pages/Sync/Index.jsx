import { Head, Link, router } from '@inertiajs/react';
import { RefreshCw, Server, TimerReset } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge, Button, EmptyState, Panel, StatCard } from '@/Components/UI';
import { formatDate } from '@/lib/utils';

export default function SyncIndex({ logs, chrInfo, error }) {
    return (
        <AdminLayout
            title="Sinkron CHR"
            subtitle="Tarik secret L2TP, sesi aktif, dan NAT dari MikroTik supaya panel selalu sama dengan router."
            crumbs={[{ label: 'Sinkron CHR' }]}
        >
            <Head title="Sinkron CHR" />

            {error && (
                <div className="mb-6 rounded-2xl border border-rose/20 bg-rose/8 px-4 py-3 text-sm text-rose">
                    Koneksi CHR gagal: {error}{' '}
                    <Link href="/settings" className="font-medium underline underline-offset-2">
                        Periksa pengaturan
                    </Link>
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

            <div className="grid gap-6 lg:grid-cols-5">
                <Panel className="lg:col-span-2" title="Apa yang terjadi saat pull" description="Scheduler juga menjalankan ini setiap 5 menit.">
                    <ol className="space-y-4 text-sm text-ink-soft">
                        {[
                            ['Baca CHR', '/ppp secret, /ppp active, dan /ip firewall nat lewat API 8728.'],
                            ['Upsert pelanggan', 'Setiap secret L2TP jadi akun + tunnel + port, dicocokkan dari username / IP.'],
                            ['Tandai online', 'Sesi PPP aktif muncul sebagai badge Online di daftar pelanggan.'],
                            ['Set masa aktif', 'Setelah sync, buka detail pelanggan untuk paket 7/30/90/365 hari.'],
                        ].map(([title, text], i) => (
                            <li key={title} className="flex gap-3">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
                                    {i + 1}
                                </span>
                                <div>
                                    <div className="font-medium text-ink">{title}</div>
                                    <p className="mt-0.5 text-xs leading-relaxed">{text}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </Panel>

                <Panel className="lg:col-span-3" title="Log sinkronisasi" description="Hasil pull dan expiry terakhir.">
                    <div className="space-y-2">
                        {logs.map((log) => (
                            <div
                                key={log.id}
                                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/8 bg-white/60 px-4 py-3 text-sm"
                            >
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge status={log.status === 'success' ? 'success' : 'error'}>
                                            {log.status === 'success' ? 'Berhasil' : 'Gagal'}
                                        </Badge>
                                        <span className="uppercase tracking-wide text-ink-soft/60">{log.type}</span>
                                    </div>
                                    <div className="mt-1 text-ink">{log.message}</div>
                                    <div className="mt-0.5 text-xs text-ink-soft/60">
                                        {log.customers_synced} pelanggan · {log.ports_synced} port · {formatDate(log.created_at)}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {logs.length === 0 && (
                            <EmptyState
                                icon={RefreshCw}
                                title="Belum ada log"
                                description="Klik Pull dari CHR sekarang, atau tunggu scheduler 5 menit sekali."
                            />
                        )}
                    </div>
                </Panel>
            </div>
        </AdminLayout>
    );
}
