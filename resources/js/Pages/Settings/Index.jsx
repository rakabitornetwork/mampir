import { Head, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button, Field, Panel, inputClass } from '@/Components/UI';
import { formatIDR } from '@/lib/utils';

export default function SettingsIndex({ plans, chr }) {
    const form = useForm({
        name: '',
        duration_days: 30,
        price: 0,
        description: '',
    });

    return (
        <AdminLayout title="Pengaturan" subtitle="Paket langganan dan konfigurasi endpoint CHR.">
            <Head title="Pengaturan" />

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Paket langganan">
                    <div className="mb-5 space-y-2">
                        {plans.map((p) => (
                            <div
                                key={p.id}
                                className="flex items-center justify-between rounded-xl border border-ink/8 bg-white/60 px-3 py-2.5 text-sm"
                            >
                                <div>
                                    <div className="font-medium">{p.name}</div>
                                    <div className="text-xs text-ink-soft/70">
                                        {p.duration_days} hari · {formatIDR(p.price)}
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    onClick={() => {
                                        if (confirm('Hapus paket ini?')) {
                                            router.delete(`/settings/plans/${p.id}`);
                                        }
                                    }}
                                >
                                    Hapus
                                </Button>
                            </div>
                        ))}
                    </div>

                    <form
                        className="space-y-3 border-t border-ink/8 pt-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/settings/plans', { onSuccess: () => form.reset() });
                        }}
                    >
                        <Field label="Nama paket">
                            <input className={inputClass()} value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Durasi hari">
                                <input
                                    type="number"
                                    className={inputClass()}
                                    value={form.data.duration_days}
                                    onChange={(e) => form.setData('duration_days', e.target.value)}
                                />
                            </Field>
                            <Field label="Harga">
                                <input
                                    type="number"
                                    className={inputClass()}
                                    value={form.data.price}
                                    onChange={(e) => form.setData('price', e.target.value)}
                                />
                            </Field>
                        </div>
                        <Field label="Deskripsi">
                            <input
                                className={inputClass()}
                                value={form.data.description}
                                onChange={(e) => form.setData('description', e.target.value)}
                            />
                        </Field>
                        <Button type="submit" variant="teal" disabled={form.processing}>
                            Tambah paket
                        </Button>
                    </form>
                </Panel>

                <Panel title="Endpoint CHR (dari .env)">
                    <dl className="space-y-3 text-sm">
                        {[
                            ['Host', chr.host],
                            ['SSH Port', chr.port],
                            ['Username', chr.username],
                            ['Public IP', chr.public_ip],
                            ['Tunnel gateway', chr.tunnel_gateway],
                            ['Tunnel network', chr.tunnel_network],
                            ['Port block range', `${chr.port_block_start}–${chr.port_block_end} step ${chr.port_block_step}`],
                        ].map(([k, v]) => (
                            <div key={k} className="flex justify-between gap-4 border-b border-ink/6 pb-2">
                                <dt className="text-ink-soft/70">{k}</dt>
                                <dd className="font-mono text-ink">{v}</dd>
                            </div>
                        ))}
                    </dl>

                    <div className="mt-5">
                        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-soft/70">
                            Pola layanan standar
                        </div>
                        <div className="space-y-2">
                            {Object.entries(chr.service_templates || {}).map(([key, tpl]) => (
                                <div key={key} className="flex justify-between rounded-lg bg-ink/[0.03] px-3 py-2 font-mono text-xs">
                                    <span>{key}</span>
                                    <span>
                                        local:{tpl.local_port} · offset:+{tpl.offset}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Panel>
            </div>
        </AdminLayout>
    );
}
