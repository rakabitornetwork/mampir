import { Head, Link, router } from '@inertiajs/react';
import { Pencil, Plus, Radio, Search, Trash2, Users } from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge, Button, Panel, inputClass } from '@/Components/UI';
import { formatDate } from '@/lib/utils';

export default function CustomersIndex({ customers, filters, counts }) {
    const [q, setQ] = useState(filters.q || '');

    const search = (e) => {
        e.preventDefault();
        router.get('/customers', { q, status: filters.status || undefined }, { preserveState: true });
    };

    const handleDelete = (c) => {
        if (
            confirm(
                `Apakah Anda yakin ingin menghapus pelanggan "${c.name}"?\n\nTindakan ini akan menghapus akun, memutus koneksi aktif, serta menghapus PPP secret dan NAT rules di MikroTik CHR.`
            )
        ) {
            router.delete(`/customers/${c.id}`);
        }
    };

    return (
        <AdminLayout title="Pelanggan" subtitle="Kelola akun tunnel, masa aktif, dan port forward.">
            <Head title="Pelanggan" />

            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                    {[
                        ['', 'Semua', counts.all],
                        ['active', 'Aktif', counts.active],
                        ['expired', 'Expired', counts.expired],
                    ].map(([status, label, count]) => (
                        <button
                            key={label}
                            type="button"
                            onClick={() => router.get('/customers', { q, status: status || undefined })}
                            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                                (filters.status || '') === status
                                    ? 'border-teal bg-teal text-white'
                                    : 'border-ink/10 bg-white text-ink-soft hover:border-teal/30'
                            }`}
                        >
                            {label} · {count}
                        </button>
                    ))}
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky/20 bg-sky/10 px-3 py-1.5 text-xs text-sky">
                        <Radio className="h-3.5 w-3.5" />
                        Online {counts.online}
                    </span>
                </div>
                <Link href="/customers/create">
                    <Button variant="teal">
                        <Plus className="h-4 w-4" />
                        Pelanggan baru
                    </Button>
                </Link>
            </div>

            <Panel>
                <form onSubmit={search} className="mb-5 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
                        <input
                            className={inputClass('pl-10')}
                            placeholder="Cari nama, username, IP tunnel…"
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                        />
                    </div>
                    <Button type="submit" variant="soft">
                        Cari
                    </Button>
                </form>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                        <thead>
                            <tr className="border-b border-ink/8 text-xs uppercase tracking-wider text-ink-soft/60">
                                <th className="pb-3 font-medium">Pelanggan</th>
                                <th className="pb-3 font-medium">Tunnel</th>
                                <th className="pb-3 font-medium">Port</th>
                                <th className="pb-3 font-medium">Masa aktif</th>
                                <th className="pb-3 font-medium">Status</th>
                                <th className="pb-3 text-right font-medium">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ink/6">
                            {customers.data.map((c) => (
                                <tr key={c.id} className="group">
                                    <td className="py-3.5">
                                        <Link href={`/customers/${c.id}`} className="font-medium text-ink group-hover:text-teal">
                                            {c.name}
                                        </Link>
                                        <div className="font-mono text-xs text-ink-soft/65">{c.username}</div>
                                    </td>
                                    <td className="py-3.5 font-mono text-xs text-ink-soft">
                                        {c.remote_address || '—'}
                                        {c.is_online && (
                                            <div className="mt-1">
                                                <Badge status="online">online</Badge>
                                            </div>
                                        )}
                                    </td>
                                    <td className="py-3.5">
                                        <span className="font-mono text-xs">{c.ports_count}</span>
                                        {c.port_block && (
                                            <div className="text-[11px] text-ink-soft/60">block {c.port_block}</div>
                                        )}
                                    </td>
                                    <td className="py-3.5 text-xs text-ink-soft">
                                        {c.expires_at ? (
                                            <>
                                                <div>{formatDate(c.expires_at)}</div>
                                                <div>{c.days_remaining ?? 0} hari tersisa</div>
                                            </>
                                        ) : (
                                            'Tanpa batas / belum di-set'
                                        )}
                                    </td>
                                    <td className="py-3.5">
                                        <Badge status={c.status}>{c.status}</Badge>
                                    </td>
                                    <td className="py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <Link href={`/customers/${c.id}/edit`}>
                                                <button
                                                    type="button"
                                                    title="Edit Pelanggan"
                                                    className="rounded-lg p-1.5 text-ink-soft hover:bg-ink/5 hover:text-ink transition"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </button>
                                            </Link>
                                            <button
                                                type="button"
                                                title="Hapus Pelanggan"
                                                onClick={() => handleDelete(c)}
                                                className="rounded-lg p-1.5 text-ink-soft hover:bg-rose/10 hover:text-rose transition"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {customers.data.length === 0 && (
                        <div className="flex flex-col items-center gap-2 py-12 text-ink-soft/70">
                            <Users className="h-8 w-8 opacity-40" />
                            <p>Belum ada pelanggan pada filter ini.</p>
                        </div>
                    )}
                </div>

                {customers.links?.length > 3 && (
                    <div className="mt-5 flex flex-wrap gap-2">
                        {customers.links.map((link, idx) => (
                            <button
                                key={idx}
                                type="button"
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                className={`rounded-lg px-3 py-1.5 text-xs ${
                                    link.active ? 'bg-ink text-white' : 'bg-white text-ink-soft border border-ink/10'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </Panel>
        </AdminLayout>
    );
}
