import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Cable,
    Clock3,
    CloudUpload,
    Plus,
    Radio,
    RefreshCw,
    ScrollText,
    Settings2,
    Users,
    Waypoints,
} from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge, Button, Panel, StatCard, WorkflowCard } from '@/Components/UI';
import { formatDate, relativeTime } from '@/lib/utils';

const portLabels = {
    ssh: 'SSH',
    http: 'HTTP',
    olt: 'OLT',
    api: 'API',
    winbox: 'Winbox',
};

export default function Dashboard({
    stats,
    recentCustomers,
    onlineTunnels,
    expiring,
    lastSync,
    portUsage,
    chr,
    setup,
}) {
    const flags = [
        setup?.chr_configured,
        setup?.has_customers,
        setup?.has_customers,
        setup?.has_online || setup?.has_synced,
    ];
    const currentIdx = flags.findIndex((done) => !done);

    const workflow = [
        {
            icon: Settings2,
            title: 'Hubungkan CHR',
            description: 'Isi host API 8728, akun, dan public IP di Pengaturan.',
            done: setup?.chr_configured,
            state: setup?.chr_configured ? 'done' : currentIdx === 0 ? 'now' : 'wait',
            action: (
                <Link href="/settings" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal">
                    Buka pengaturan <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            ),
        },
        {
            icon: Users,
            title: 'Isi pelanggan',
            description: 'Buat akun baru, atau tarik secret L2TP yang sudah ada di CHR.',
            done: setup?.has_customers,
            state: setup?.has_customers ? 'done' : currentIdx === 1 ? 'now' : 'wait',
            action: (
                <div className="mt-3 flex flex-wrap gap-3">
                    <Link href="/customers/create" className="inline-flex items-center gap-1 text-xs font-medium text-teal">
                        Buat pelanggan <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                    <Link href="/sync" className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft">
                        Tarik dari CHR
                    </Link>
                </div>
            ),
        },
        {
            icon: ScrollText,
            title: 'Ambil script',
            description: 'Generate script client untuk router pelanggan dan server untuk CHR.',
            done: setup?.has_customers,
            state: setup?.has_customers ? 'done' : currentIdx === 2 ? 'now' : 'wait',
            action: (
                <Link href="/scripts" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal">
                    Buka generator <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            ),
        },
        {
            icon: CloudUpload,
            title: 'Push ke CHR',
            description: 'Kirim PPP secret & NAT, lalu pantau sesi online di dashboard ini.',
            done: setup?.has_online || setup?.has_synced,
            state: setup?.has_online || setup?.has_synced ? 'done' : currentIdx === 3 ? 'now' : 'wait',
            action: (
                <Link href="/sync" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-teal">
                    Sinkron sekarang <ArrowRight className="h-3.5 w-3.5" />
                </Link>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Dashboard"
            subtitle="Ikuti 4 langkah di bawah, lalu kelola tunnel, port forward, dan masa aktif dari satu panel."
        >
            <Head title="Dashboard" />

            <div className="mb-8">
                <div className="mb-3 flex items-end justify-between gap-3">
                    <div>
                        <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">Alur kerja</div>
                        <h2 className="mt-1 text-lg font-semibold tracking-tight text-ink">Dari koneksi sampai pelanggan online</h2>
                    </div>
                    <Link href="/customers/create">
                        <Button variant="teal">
                            <Plus className="h-4 w-4" />
                            Pelanggan baru
                        </Button>
                    </Link>
                </div>
                <WorkflowCard steps={workflow} />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Pelanggan" value={stats.customers} icon={Users} tone="ink" hint={`${stats.active} aktif · ${stats.expired} habis masa`} />
                <StatCard label="Online sekarang" value={stats.online} icon={Radio} tone="sky" hint="Sesi PPP aktif di CHR" />
                <StatCard label="Port forward" value={stats.ports} icon={Waypoints} tone="teal" hint="Mapping DST-NAT" />
                <StatCard label="Segera habis" value={stats.expiring_soon} icon={Clock3} tone="amber" hint="≤ 7 hari lagi" />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <Panel
                    className="xl:col-span-2"
                    title="Pelanggan terbaru"
                    description="Klik nama untuk melihat tunnel, port, script, dan perpanjang masa aktif."
                    action={
                        <Link href="/customers">
                            <Button variant="soft">Lihat semua</Button>
                        </Link>
                    }
                >
                    <div className="space-y-2">
                        {recentCustomers.map((c) => (
                            <Link
                                key={c.id}
                                href={`/customers/${c.id}`}
                                className="flex items-center justify-between gap-4 rounded-xl border border-ink/6 bg-white/70 px-4 py-3 transition hover:border-teal/25 hover:bg-white"
                            >
                                <div className="min-w-0">
                                    <div className="font-medium text-ink">{c.name}</div>
                                    <div className="mt-0.5 truncate font-mono text-xs text-ink-soft/70">
                                        {c.username} · {c.remote_address || 'IP belum dialokasi'}
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                    {c.is_online && <Badge status="online" pulse>Online</Badge>}
                                    <Badge status={c.status} />
                                </div>
                            </Link>
                        ))}
                        {recentCustomers.length === 0 && (
                            <p className="py-6 text-center text-sm text-ink-soft/70">
                                Belum ada pelanggan. Buat baru, atau tarik dari CHR.
                            </p>
                        )}
                    </div>
                </Panel>

                <div className="space-y-6">
                    <Panel title="Status CHR" description="Koneksi API ke Cloud Hosted Router.">
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2 text-ink">
                                <Cable className="h-4 w-4 text-teal" />
                                <span className="font-mono">{chr.public_ip || 'Public IP belum di-set'}</span>
                            </div>
                            <div className="rounded-xl bg-ink/[0.03] px-3 py-2 text-ink-soft">
                                Host API:{' '}
                                <span className="font-mono text-ink">
                                    {chr.host || '—'}
                                    {chr.host && chr.port ? `:${chr.port}` : ''}
                                </span>
                            </div>
                            {lastSync ? (
                                <div className="text-xs text-ink-soft/70">
                                    Sync {relativeTime(lastSync.created_at)} · {lastSync.message}
                                </div>
                            ) : (
                                <div className="text-xs text-ink-soft/70">Belum pernah sinkron. Scheduler jalan tiap 5 menit setelah CHR terhubung.</div>
                            )}
                            <Link href="/sync" className="block">
                                <Button variant="teal" className="mt-1 w-full">
                                    <RefreshCw className="h-4 w-4" />
                                    Buka sinkronisasi
                                </Button>
                            </Link>
                        </div>
                    </Panel>

                    <Panel title="Distribusi port">
                        <div className="space-y-2">
                            {Object.keys(portUsage || {}).length === 0 && (
                                <p className="text-sm text-ink-soft/70">Belum ada data port.</p>
                            )}
                            {Object.entries(portUsage || {}).map(([key, total]) => (
                                <div key={key || 'custom'} className="flex items-center justify-between text-sm">
                                    <span className="text-ink-soft">{portLabels[key] || key || 'Custom'}</span>
                                    <span className="font-mono tabular text-ink">{total}</span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Panel title="Tunnel online" description="Sesi L2TP yang sedang aktif di CHR.">
                    <div className="space-y-2">
                        {onlineTunnels.map((t) => {
                            const row = (
                                <div className="flex items-start justify-between gap-3 rounded-xl bg-sky/6 px-3 py-2.5">
                                    <div>
                                        <div className="flex items-center gap-2 font-medium">
                                            {t.name}
                                            <Badge status="online" pulse>
                                                Live
                                            </Badge>
                                        </div>
                                        <div className="font-mono text-xs text-ink-soft/70">
                                            {t.username} · {t.remote_address}
                                        </div>
                                        <div className="mt-1 text-xs text-ink-soft/60">
                                            Caller {t.caller_id || '—'} · up {t.uptime || '—'}
                                        </div>
                                    </div>
                                </div>
                            );
                            return t.customer_id ? (
                                <Link key={t.id} href={`/customers/${t.customer_id}`}>
                                    {row}
                                </Link>
                            ) : (
                                <div key={t.id}>{row}</div>
                            );
                        })}
                        {onlineTunnels.length === 0 && <p className="text-sm text-ink-soft/70">Tidak ada sesi aktif saat ini.</p>}
                    </div>
                </Panel>

                <Panel title="Masa aktif hampir habis" description="Perpanjang dari halaman detail pelanggan.">
                    <div className="space-y-2">
                        {expiring.map((c) => (
                            <Link
                                key={c.id}
                                href={`/customers/${c.id}`}
                                className="flex items-center justify-between rounded-xl border border-amber/15 bg-amber/5 px-3 py-2.5"
                            >
                                <div>
                                    <div className="font-medium">{c.name}</div>
                                    <div className="text-xs text-ink-soft/70">{formatDate(c.expires_at)}</div>
                                </div>
                                <div className="flex items-center gap-1 text-sm text-amber">
                                    <AlertTriangle className="h-4 w-4" />
                                    {c.days_remaining}h
                                </div>
                            </Link>
                        ))}
                        {expiring.length === 0 && <p className="text-sm text-ink-soft/70">Tidak ada yang segera expired.</p>}
                    </div>
                </Panel>
            </div>
        </AdminLayout>
    );
}
