import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Cable,
    CloudUpload,
    Download,
    Pencil,
    RefreshCcw,
    Terminal,
    Trash2,
} from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge, Button, CodeBlock, ConfirmDialog, Field, InfoItem, Panel, checkboxClass, inputClass } from '@/Components/UI';
import { formatDate, formatIDR } from '@/lib/utils';

export default function CustomerShow({ customer, scripts, plans, publicIp }) {
    const [copied, setCopied] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const renew = useForm({
        plan_id: plans?.[1]?.id || '',
        duration_days: 30,
        push_to_chr: true,
    });

    return (
        <AdminLayout
            title={customer.name}
            subtitle="Detail tunnel, port, script, dan perpanjang masa aktif — urut dari kiri ke kanan."
            crumbs={[{ href: '/customers', label: 'Pelanggan' }, { label: customer.name }]}
        >
            <Head title={customer.name} />

            <div className="mb-6 flex flex-wrap items-center gap-2">
                <Badge status={customer.status} />
                {customer.tunnel?.is_online && (
                    <Badge status="online" pulse>
                        Online
                    </Badge>
                )}
                {customer.synced_from_chr && (
                    <span className="rounded-full border border-ink/10 bg-white px-2.5 py-0.5 text-[11px] uppercase tracking-wide text-ink-soft">
                        dari CHR
                    </span>
                )}
                <div className="ml-auto flex flex-wrap gap-2">
                    <Link href={`/customers/${customer.id}/edit`}>
                        <Button variant="soft">
                            <Pencil className="h-4 w-4" />
                            Edit data
                        </Button>
                    </Link>
                    <Button variant="teal" onClick={() => router.post(`/customers/${customer.id}/push`)}>
                        <CloudUpload className="h-4 w-4" />
                        Push ke CHR
                    </Button>
                    <Button variant="danger" onClick={() => setConfirmDelete(true)}>
                        <Trash2 className="h-4 w-4" />
                        Hapus
                    </Button>
                </div>
            </div>

            <div className="mb-6 grid gap-2 rounded-2xl border border-ink/8 bg-white/70 p-2 text-xs text-ink-soft sm:grid-cols-4">
                {[
                    ['1', 'Cek tunnel & port', 'Pastikan IP dan mapping sudah benar'],
                    ['2', 'Perpanjang masa aktif', 'Pilih paket di kolom kanan'],
                    ['3', 'Salin script client', 'Tempel di router pelanggan'],
                    ['4', 'Push ke CHR', 'Jika belum otomatis terkirim'],
                ].map(([n, title, hint]) => (
                    <div key={n} className="rounded-xl px-3 py-2">
                        <div className="font-mono text-[10px] text-gold">{n}</div>
                        <div className="mt-0.5 font-medium text-ink">{title}</div>
                        <div className="text-[11px]">{hint}</div>
                    </div>
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                    <Panel title="Tunnel & endpoint" description="Klik nilai untuk menyalin IP, username, atau password.">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <InfoItem label="Public CHR" value={publicIp} mono copy />
                            <InfoItem label="Remote address" value={customer.tunnel?.remote_address} mono copy />
                            <InfoItem label="Local gateway" value={customer.tunnel?.local_address} mono copy />
                            <InfoItem label="Port block" value={customer.tunnel?.port_block ?? '—'} mono />
                            <InfoItem label="Caller ID" value={customer.tunnel?.caller_id || '—'} mono />
                            <InfoItem label="Uptime" value={customer.tunnel?.uptime || '—'} />
                            <InfoItem label="Username PPP" value={customer.username} mono copy />
                            <InfoItem label="Password" value={customer.password || '—'} mono copy />
                            <InfoItem
                                label="Masa aktif"
                                value={
                                    customer.expires_at
                                        ? `${formatDate(customer.expires_at)} · ${customer.days_remaining ?? 0} hari`
                                        : 'Belum di-set'
                                }
                            />
                        </div>
                    </Panel>

                    <Panel title="Port forward" description="Alamat publik yang dipakai pelanggan untuk SSH, Winbox, OLT, dan layanan lain.">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] text-sm">
                                <thead>
                                    <tr className="border-b border-ink/8 text-[11px] uppercase tracking-wider text-ink-soft/60">
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
                                                <Badge status={pf.enabled ? 'on' : 'off'} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {(customer.tunnel?.port_forwards || []).length === 0 && (
                                <p className="text-sm text-ink-soft/70">Belum ada port forward. Edit pelanggan atau tarik ulang dari CHR.</p>
                            )}
                        </div>
                    </Panel>

                    <Panel
                        title="Script generator"
                        description="Server untuk CHR, client untuk router pelanggan. Salin atau unduh berkas .rsc."
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
                                    Tempel di CHR
                                </div>
                                <CodeBlock
                                    code={scripts.server}
                                    label="Server · CHR"
                                    onCopy={() => setCopied('server')}
                                />
                            </div>
                            <div>
                                <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-ink-soft/70">
                                    <Terminal className="h-3.5 w-3.5 text-sky" />
                                    Tempel di router pelanggan
                                </div>
                                <CodeBlock
                                    code={scripts.client}
                                    label="Client · pelanggan"
                                    onCopy={() => setCopied('client')}
                                />
                            </div>
                        </div>
                        {copied && (
                            <p className="mt-3 text-xs text-teal">Script {copied} disalin ke clipboard.</p>
                        )}
                    </Panel>
                </div>

                <div className="space-y-6">
                    <Panel title="Perpanjang masa aktif" description="Saat habis, scheduler menonaktifkan PPP secret di CHR.">
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
                                    className={checkboxClass()}
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
                    </Panel>

                    <Panel title="Riwayat langganan">
                        <div className="space-y-3">
                            {customer.subscriptions.map((s) => (
                                <div key={s.id} className="rounded-xl border border-ink/8 bg-white/50 px-3 py-2.5 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{s.plan || `${s.duration_days} hari`}</span>
                                        <Badge status={s.status} />
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
                        <div className="space-y-3 text-sm">
                            <InfoItem label="Email" value={customer.email || '—'} />
                            <InfoItem label="Telepon" value={customer.phone || '—'} />
                            <InfoItem label="Perusahaan" value={customer.company || '—'} />
                            <InfoItem label="Catatan" value={customer.notes || '—'} />
                        </div>
                    </Panel>
                </div>
            </div>

            <ConfirmDialog
                open={confirmDelete}
                title={`Hapus ${customer.name}?`}
                body="Akun, sesi aktif, PPP secret, dan NAT rules di MikroTik CHR akan dihapus. Tindakan ini tidak bisa dibatalkan."
                onCancel={() => setConfirmDelete(false)}
                onConfirm={() => router.delete(`/customers/${customer.id}`)}
            />
        </AdminLayout>
    );
}
