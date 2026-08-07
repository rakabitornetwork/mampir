import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    Cable,
    Clock3,
    Network,
    Radio,
    Users,
    Waypoints,
} from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge, Button, Panel, StatCard } from '@/Components/UI';
import { formatDate } from '@/lib/utils';

export default function Dashboard({
    stats,
    recentCustomers,
    onlineTunnels,
    expiring,
    lastSync,
    portUsage,
    chr,
}) {
    return (
        <AdminLayout
            title="Dashboard"
            subtitle="Ringkasan tunnel L2TP, port forward, dan masa aktif pelanggan CHR."
        >
            <Head title="Dashboard" />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard label="Pelanggan" value={stats.customers} icon={Users} tone="ink" hint={`${stats.active} aktif`} />
                <StatCard label="Online sekarang" value={stats.online} icon={Radio} tone="sky" hint="PPP active di CHR" />
                <StatCard label="Port forward" value={stats.ports} icon={Waypoints} tone="teal" hint="DST-NAT mapping" />
                <StatCard
                    label="Segera habis"
                    value={stats.expiring_soon}
                    icon={Clock3}
                    tone="amber"
                    hint="≤ 7 hari lagi"
                />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-3">
                <Panel
                    className="xl:col-span-2"
                    title="Pelanggan terbaru"
                    action={
                        <Link href="/customers">
                            <Button variant="soft">Lihat semua</Button>
                        </Link>
                    }
                >
                    <div className="space-y-3">
                        {recentCustomers.map((c) => (
                            <Link
                                key={c.id}
                                href={`/customers/${c.id}`}
                                className="flex items-center justify-between gap-4 rounded-xl border border-ink/6 bg-white/60 px-4 py-3 transition hover:border-teal/25 hover:bg-white"
                            >
                                <div>
                                    <div className="font-medium text-ink">{c.name}</div>
                                    <div className="mt-0.5 font-mono text-xs text-ink-soft/70">
                                        {c.username} · {c.remote_address || '—'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {c.is_online && <Badge status="online">online</Badge>}
                                    <Badge status={c.status}>{c.status}</Badge>
                                </div>
                            </Link>
                        ))}
                        {recentCustomers.length === 0 && (
                            <p className="text-sm text-ink-soft/70">Belum ada pelanggan. Sinkronkan dari CHR terlebih dahulu.</p>
                        )}
                    </div>
                </Panel>

                <div className="space-y-6">
                    <Panel title="Status CHR">
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-2 text-ink">
                                <Cable className="h-4 w-4 text-teal" />
                                <span className="font-mono">{chr.public_ip}</span>
                            </div>
                            <div className="rounded-xl bg-ink/[0.03] px-3 py-2 text-ink-soft">
                                Host API: <span className="font-mono text-ink">{chr.host}</span>
                                    {chr.port ? `:${chr.port}` : ''}
                            </div>
                            {lastSync ? (
                                <div className="text-xs text-ink-soft/70">
                                    Sync terakhir: {formatDate(lastSync.created_at)} · {lastSync.message}
                                </div>
                            ) : (
                                <div className="text-xs text-ink-soft/70">Belum pernah sinkron.</div>
                            )}
                            <Link href="/sync">
                                <Button variant="teal" className="mt-2 w-full">
                                    Buka Sinkronisasi
                                </Button>
                            </Link>
                        </div>
                    </Panel>

                    <Panel title="Distribusi layanan port">
                        <div className="space-y-2">
                            {Object.keys(portUsage || {}).length === 0 && (
                                <p className="text-sm text-ink-soft/70">Belum ada data port.</p>
                            )}
                            {Object.entries(portUsage || {}).map(([key, total]) => (
                                <div key={key || 'custom'} className="flex items-center justify-between text-sm">
                                    <span className="uppercase tracking-wide text-ink-soft">{key || 'custom'}</span>
                                    <span className="font-mono text-ink">{total}</span>
                                </div>
                            ))}
                        </div>
                    </Panel>
                </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <Panel title="Tunnel online">
                    <div className="space-y-3">
                        {onlineTunnels.map((t) => (
                            <div key={t.id} className="flex items-start justify-between gap-3 rounded-xl bg-sky/5 px-3 py-2.5">
                                <div>
                                    <div className="font-medium">{t.name}</div>
                                    <div className="font-mono text-xs text-ink-soft/70">
                                        {t.username} · {t.remote_address}
                                    </div>
                                    <div className="mt-1 text-xs text-ink-soft/60">Caller {t.caller_id || '—'} · up {t.uptime || '—'}</div>
                                </div>
                                <Network className="h-4 w-4 text-sky" />
                            </div>
                        ))}
                        {onlineTunnels.length === 0 && <p className="text-sm text-ink-soft/70">Tidak ada sesi aktif.</p>}
                    </div>
                </Panel>

                <Panel title="Masa aktif hampir habis">
                    <div className="space-y-3">
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
