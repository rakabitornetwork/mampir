import { Head, router, useForm } from '@inertiajs/react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge, Button, Field, Panel, inputClass } from '@/Components/UI';
import { formatIDR } from '@/lib/utils';

export default function SettingsIndex({ plans, chr }) {
    const planForm = useForm({
        name: '',
        duration_days: 30,
        price: 0,
        description: '',
    });

    const chrForm = useForm({
        host: chr.host || '',
        port: chr.port || 22,
        username: chr.username || '',
        password: chr.password || '',
        public_ip: chr.public_ip || '',
        tunnel_gateway: chr.tunnel_gateway || '',
        tunnel_network: chr.tunnel_network || '',
        tunnel_start_host: chr.tunnel_start_host || 2,
        tunnel_end_host: chr.tunnel_end_host || 250,
        default_profile: chr.default_profile || 'default-encryption',
        port_block_start: chr.port_block_start || 1100,
        port_block_end: chr.port_block_end || 8900,
        port_block_step: chr.port_block_step || 300,
        service_templates: chr.service_templates || {},
    });

    const templateEntries = Object.entries(chrForm.data.service_templates || {});

    const setTemplateField = (key, field, value) => {
        chrForm.setData('service_templates', {
            ...chrForm.data.service_templates,
            [key]: {
                ...chrForm.data.service_templates[key],
                [field]: value,
            },
        });
    };

    return (
        <AdminLayout title="Pengaturan" subtitle="Paket langganan dan konfigurasi endpoint CHR dari panel.">
            <Head title="Pengaturan" />

            <div className="grid gap-6 xl:grid-cols-2">
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
                            planForm.post('/settings/plans', { onSuccess: () => planForm.reset() });
                        }}
                    >
                        <Field label="Nama paket">
                            <input
                                className={inputClass()}
                                value={planForm.data.name}
                                onChange={(e) => planForm.setData('name', e.target.value)}
                            />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Durasi hari">
                                <input
                                    type="number"
                                    className={inputClass()}
                                    value={planForm.data.duration_days}
                                    onChange={(e) => planForm.setData('duration_days', e.target.value)}
                                />
                            </Field>
                            <Field label="Harga">
                                <input
                                    type="number"
                                    className={inputClass()}
                                    value={planForm.data.price}
                                    onChange={(e) => planForm.setData('price', e.target.value)}
                                />
                            </Field>
                        </div>
                        <Field label="Deskripsi">
                            <input
                                className={inputClass()}
                                value={planForm.data.description}
                                onChange={(e) => planForm.setData('description', e.target.value)}
                            />
                        </Field>
                        <Button type="submit" variant="teal" disabled={planForm.processing}>
                            Tambah paket
                        </Button>
                    </form>
                </Panel>

                <Panel
                    title="Endpoint CHR"
                    action={
                        <Badge status={chr.source === 'database' ? 'active' : 'suspended'}>
                            {chr.source === 'database' ? 'Database' : 'Default'}
                        </Badge>
                    }
                >
                    <p className="mb-4 text-sm text-ink-soft/80">
                        Disimpan di database lewat panel ini. Tidak perlu mengedit file{' '}
                        <span className="font-mono text-ink">.env</span> untuk koneksi CHR.
                    </p>

                    <form
                        className="space-y-4"
                        onSubmit={(e) => {
                            e.preventDefault();
                            chrForm.put('/settings/chr');
                        }}
                    >
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Host / IP SSH" hint={chrForm.errors.host}>
                                <input
                                    className={inputClass()}
                                    value={chrForm.data.host}
                                    onChange={(e) => chrForm.setData('host', e.target.value)}
                                    autoComplete="off"
                                />
                            </Field>
                            <Field label="Port SSH" hint={chrForm.errors.port}>
                                <input
                                    type="number"
                                    className={inputClass()}
                                    value={chrForm.data.port}
                                    onChange={(e) => chrForm.setData('port', e.target.value)}
                                />
                            </Field>
                            <Field label="Username" hint={chrForm.errors.username}>
                                <input
                                    className={inputClass()}
                                    value={chrForm.data.username}
                                    onChange={(e) => chrForm.setData('username', e.target.value)}
                                    autoComplete="off"
                                />
                            </Field>
                            <Field
                                label="Password"
                                hint={
                                    chrForm.errors.password ||
                                    (chr.has_password
                                        ? 'Kosongkan untuk mempertahankan password yang sudah tersimpan'
                                        : 'Belum ada password tersimpan')
                                }
                            >
                                <input
                                    type="password"
                                    className={inputClass()}
                                    value={chrForm.data.password}
                                    onChange={(e) => chrForm.setData('password', e.target.value)}
                                    autoComplete="new-password"
                                    placeholder={chr.has_password ? '••••••••' : ''}
                                />
                            </Field>
                            <Field label="Public IP" hint={chrForm.errors.public_ip}>
                                <input
                                    className={inputClass()}
                                    value={chrForm.data.public_ip}
                                    onChange={(e) => chrForm.setData('public_ip', e.target.value)}
                                />
                            </Field>
                            <Field label="Default PPP profile" hint={chrForm.errors.default_profile}>
                                <input
                                    className={inputClass()}
                                    value={chrForm.data.default_profile}
                                    onChange={(e) => chrForm.setData('default_profile', e.target.value)}
                                />
                            </Field>
                        </div>

                        <div className="border-t border-ink/8 pt-4">
                            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-soft/70">
                                Jaringan tunnel
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Field label="Tunnel gateway" hint={chrForm.errors.tunnel_gateway}>
                                    <input
                                        className={inputClass()}
                                        value={chrForm.data.tunnel_gateway}
                                        onChange={(e) => chrForm.setData('tunnel_gateway', e.target.value)}
                                    />
                                </Field>
                                <Field label="Tunnel network (prefix)" hint={chrForm.errors.tunnel_network}>
                                    <input
                                        className={inputClass()}
                                        value={chrForm.data.tunnel_network}
                                        onChange={(e) => chrForm.setData('tunnel_network', e.target.value)}
                                        placeholder="192.168.172"
                                    />
                                </Field>
                                <Field label="Host mulai" hint={chrForm.errors.tunnel_start_host}>
                                    <input
                                        type="number"
                                        className={inputClass()}
                                        value={chrForm.data.tunnel_start_host}
                                        onChange={(e) => chrForm.setData('tunnel_start_host', e.target.value)}
                                    />
                                </Field>
                                <Field label="Host akhir" hint={chrForm.errors.tunnel_end_host}>
                                    <input
                                        type="number"
                                        className={inputClass()}
                                        value={chrForm.data.tunnel_end_host}
                                        onChange={(e) => chrForm.setData('tunnel_end_host', e.target.value)}
                                    />
                                </Field>
                            </div>
                        </div>

                        <div className="border-t border-ink/8 pt-4">
                            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-soft/70">
                                Alokasi port block
                            </div>
                            <div className="grid gap-3 sm:grid-cols-3">
                                <Field label="Start" hint={chrForm.errors.port_block_start}>
                                    <input
                                        type="number"
                                        className={inputClass()}
                                        value={chrForm.data.port_block_start}
                                        onChange={(e) => chrForm.setData('port_block_start', e.target.value)}
                                    />
                                </Field>
                                <Field label="End" hint={chrForm.errors.port_block_end}>
                                    <input
                                        type="number"
                                        className={inputClass()}
                                        value={chrForm.data.port_block_end}
                                        onChange={(e) => chrForm.setData('port_block_end', e.target.value)}
                                    />
                                </Field>
                                <Field label="Step" hint={chrForm.errors.port_block_step}>
                                    <input
                                        type="number"
                                        className={inputClass()}
                                        value={chrForm.data.port_block_step}
                                        onChange={(e) => chrForm.setData('port_block_step', e.target.value)}
                                    />
                                </Field>
                            </div>
                        </div>

                        <div className="border-t border-ink/8 pt-4">
                            <div className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-soft/70">
                                Pola layanan standar
                            </div>
                            <div className="space-y-3">
                                {templateEntries.map(([key, tpl]) => (
                                    <div
                                        key={key}
                                        className="rounded-xl border border-ink/8 bg-white/60 p-3"
                                    >
                                        <div className="mb-2 font-mono text-xs uppercase tracking-wide text-teal">
                                            {key}
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-3">
                                            <Field label="Label">
                                                <input
                                                    className={inputClass()}
                                                    value={tpl.label || ''}
                                                    onChange={(e) => setTemplateField(key, 'label', e.target.value)}
                                                />
                                            </Field>
                                            <Field label="Local port">
                                                <input
                                                    type="number"
                                                    className={inputClass()}
                                                    value={tpl.local_port ?? ''}
                                                    onChange={(e) =>
                                                        setTemplateField(key, 'local_port', e.target.value)
                                                    }
                                                />
                                            </Field>
                                            <Field label="Offset">
                                                <input
                                                    type="number"
                                                    className={inputClass()}
                                                    value={tpl.offset ?? ''}
                                                    onChange={(e) => setTemplateField(key, 'offset', e.target.value)}
                                                />
                                            </Field>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <Button type="submit" variant="teal" disabled={chrForm.processing}>
                                {chrForm.processing ? 'Menyimpan…' : 'Simpan pengaturan CHR'}
                            </Button>
                            {chrForm.isDirty && (
                                <span className="text-xs text-amber">Ada perubahan belum disimpan</span>
                            )}
                        </div>
                    </form>
                </Panel>
            </div>
        </AdminLayout>
    );
}
