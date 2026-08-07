import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Cable,
    CloudUpload,
    Copy,
    Download,
    Pencil,
    RefreshCcw,
    Terminal,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge, Button, CodeBlock, Field, Panel, inputClass } from '@/Components/UI';
import { formatDate, formatIDR } from '@/lib/utils';

export default function CustomerShow({ customer, scripts, plans, publicIp }) {
    const [copied, setCopied] = useState(null);
    const renew = useForm({
        plan_id: plans?.[1]?.id || '',
        duration_days: 30,
        push_to_chr: true,
    });

    const handleDelete = () => {
        if (
            confirm(
                `Apakah Anda yakin ingin menghapus pelanggan "${customer.name}"?\n\nTindakan ini akan menghapus akun, memutus koneksi aktif, serta menghapus PPP secret dan NAT rules di MikroTik CHR.`
            )
        ) {
            router.delete(`/customers/${customer.id}`);
        }
    };

    return (
        <AdminLayout title={customer.name} subtitle={`Tunnel L2TP · ${customer.username}`}>
            <Head title={customer.name} />

            <div className="mb-6 flex flex-wrap items-center gap-2">
                <Badge status={customer.status}>{customer.status}</Badge>
                {customer.tunnel?.is_online && <Badge status="online">online</Badge>}
                {customer.synced_from_chr && (
                    <span className="rounded-full border border-ink/10 bg-white px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-ink-soft">
                        dari CHR
                    </span>
                )}
                <div className="ml-auto flex flex-wrap gap-2">
                    <Link href={`/customers/${customer.id}/edit`}>
                        <Button variant="soft">
                            <Pencil className="h-4 w-4" />
                            Edit
                        </Button>
                    </Link>
                    <Button variant="teal" onClick={() => router.post(`/customers/${customer.id}/push`)}>
                        <CloudUpload className="h-4 w-4" />
                        Push ke CHR
                    </Button>
                    <Button variant="danger" onClick={handleDelete}>
                        <Trash2 className="h-4 w-4" />
                        Hapus
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <Panel title="Tunnel & endpoint">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Info label="Public CHR" value={publicIp} mono />
                            <Info label="Remote address" value={customer.tunnel?.remote_address} mono />
                            <Info label="Local gateway" value={customer.tunnel?.local_address} mono />
                            <Info label="Port block" value={customer.tunnel?.port_block ?? '—'} mono />
                            <Info label="Caller ID" value={customer.tunnel?.caller_id || '—'} mono />
                            <Info label="Uptime" value={customer.tunnel?.uptime || '—'} />
                            <Info label="Password" value={customer.password || '—'} mono />
                            <Info
                                label="Masa aktif"
                                value={
                                    customer.expires_at
                                        ? `${formatDate(customer.expires_at)} · ${customer.days_remaining ?? 0} hari`
                                        : 'Belum di-set'
                                }
                            />
                        </div>
                    </Panel>

                    <Panel title="Port forward">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] text-sm">
                                <thead>
                                    <tr className="border-b border-ink/8 text-xs uppercase tracking-wider text-ink-soft/60">
                                        <th className="pb-2 text-left font-medium">Layanan</th>
                                        <th className="pb-2 text-left font-medium">Publik</th>
                                        <th className="pb-2 text-left font-medium">Lokal</th>
                                        <th className="pb-2 text-left font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-ink/6">
                                    {(customer.tunnel?.port_forwards || []).map((pf) => (
                                        <tr key={pf.id}>
                                            <td className="py-2.5">{pf.label}</td>
                                            <td className="py-2.5 font-mono text-xs">
                                                {publicIp}:{pf.public_label}
                                            </td>
                                            <td className="py-2.5 font-mono text-xs">:{pf.local_label}</td>
                                            <td className="py-2.5">
                                                <Badge status={pf.enabled ? 'active' : 'suspended'}>
                                                    {pf.enabled ? 'on' : 'off'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {(customer.tunnel?.port_forwards || []).length === 0 && (
                                <p className="text-sm text-ink-soft/70">Belum ada port forward.</p>
                            )}
                        </div>
                    </Panel>

                    <Panel
                        title="Script generator"
                        action={
                            <div className="flex gap-2">
                                <a href={`/scripts/${customer.id}/server`}>
                                    <Button variant="soft">
                                        <Download className="h-4 w-4" />
                                        Server
                                    </Button>
                                </a>
                                <a href={`/scripts/${customer.id}/client`}>
                                    <Button variant="soft">
                                        <Download className="h-4 w-4" />
                                        Client
                                    </Button>
                                </a>
                            </div>
                        }
                    >
                        <div className="grid gap-4 lg:grid-cols-2">
                            <div>
                                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-ink-soft/70">
                                    <Cable className="h-3.5 w-3.5 text-teal" />
                                    Server (CHR)
                                </div>
                                <CodeBlock
                                    code={scripts.server}
                                    onCopy={() => setCopied('server')}
                                />
                            </div>
                            <div>
                                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-ink-soft/70">
                                    <Terminal className="h-3.5 w-3.5 text-sky" />
                                    Client (router pelanggan)
                                </div>
                                <CodeBlock
                                    code={scripts.client}
                                    onCopy={() => setCopied('client')}
                                />
                            </div>
                        </div>
                        {copied && (
                            <p className="mt-3 flex items-center gap-1 text-xs text-teal">
                                <Copy className="h-3.5 w-3.5" />
                                Script {copied} disalin.
                            </p>
                        )}
                    </Panel>
                </div>

                <div className="space-y-6">
                    <Panel title="Perpanjang / set masa aktif">
                        <form
                            className="space-y-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                renew.post(`/customers/${customer.id}/renew`);
                            }}
                        >
                            <Field label="Paket">
                                <select
                                    className={inputClass()}
                                    value={renew.data.plan_id}
                                    onChange={(e) => {
                                        const id = e.target.value;
                                        renew.setData('plan_id', id);
                                        const plan = plans.find((p) => String(p.id) === String(id));
                                        if (plan) renew.setData('duration_days', plan.duration_days);
                                    }}
                                >
                                    <option value="">Custom</option>
                                    {plans.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} · {p.duration_days}h · {formatIDR(p.price)}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="Durasi hari">
                                <input
                                    type="number"
                                    min="1"
                                    className={inputClass()}
                                    value={renew.data.duration_days}
                                    onChange={(e) => renew.setData('duration_days', e.target.value)}
                                />
                            </Field>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={renew.data.push_to_chr}
                                    onChange={(e) => renew.setData('push_to_chr', e.target.checked)}
                                />
                                Enable secret di CHR jika aktif
                            </label>
                            <Button type="submit" variant="teal" className="w-full" disabled={renew.processing}>
                                <RefreshCcw className="h-4 w-4" />
                                Terapkan langganan
                            </Button>
                        </form>
                        <p className="mt-3 text-xs text-ink-soft/65">
                            Saat expired, scheduler <span className="font-mono">chr:expire</span> menonaktifkan PPP
                            secret di CHR secara otomatis.
                        </p>
                    </Panel>

                    <Panel title="Riwayat langganan">
                        <div className="space-y-3">
                            {customer.subscriptions.map((s) => (
                                <div key={s.id} className="rounded-xl border border-ink/8 bg-white/50 px-3 py-2.5 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{s.plan || `${s.duration_days} hari`}</span>
                                        <Badge status={s.status}>{s.status}</Badge>
                                    </div>
                                    <div className="mt-1 text-xs text-ink-soft/70">
                                        {formatDate(s.starts_at)} → {formatDate(s.expires_at)}
                                    </div>
                                </div>
                            ))}
                            {customer.subscriptions.length === 0 && (
                                <p className="text-sm text-ink-soft/70">Belum ada riwayat paket.</p>
                            )}
                        </div>
                    </Panel>

                    <Panel title="Kontak">
                        <div className="space-y-2 text-sm">
                            <Info label="Email" value={customer.email || '—'} />
                            <Info label="Telepon" value={customer.phone || '—'} />
                            <Info label="Perusahaan" value={customer.company || '—'} />
                            <Info label="Catatan" value={customer.notes || '—'} />
                        </div>
                    </Panel>
                </div>
            </div>
        </AdminLayout>
    );
}

function Info({ label, value, mono }) {
    return (
        <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-soft/55">{label}</div>
            <div className={`mt-0.5 text-sm text-ink ${mono ? 'font-mono' : ''}`}>{value}</div>
        </div>
    );
}
