import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { PlugZap } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Badge, Button, Field, Panel, Tabs, checkboxClass, inputClass } from '@/Components/UI';
import { formatIDR } from '@/lib/utils';

export default function SettingsIndex({ plans, chr }) {
    const [testing, setTesting] = useState(false);
    const [tab, setTab] = useState('koneksi');

    const planForm = useForm({
        name: '',
        duration_days: 30,
        price: 0,
        description: '',
    });

    const chrForm = useForm({
        host: chr.host || '',
        port: chr.port || 8728,
        username: chr.username || '',
        password: chr.password || '',
        ssl: !!chr.ssl,
        timeout: chr.timeout || 15,
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

    const testConnection = () => {
        router.post(
            '/settings/chr/test',
            {
                host: chrForm.data.host,
                port: chrForm.data.port,
                username: chrForm.data.username,
                password: chrForm.data.password,
                ssl: !!chrForm.data.ssl,
                timeout: chrForm.data.timeout,
            },
            {
                preserveScroll: true,
                onStart: () => setTesting(true),
                onFinish: () => setTesting(false),
            }
        );
    };

    const saveChr = (e) => {
        e.preventDefault();
        chrForm.put('/settings/chr');
    };

    return (
        <AdminLayout
            title="Pengaturan"
            subtitle="Mulai dari tab Koneksi. Jaringan mengatur alokasi IP & port. Paket dipakai saat membuat atau memperpanjang pelanggan."
            crumbs={[{ label: 'Pengaturan' }]}
        >
            <Head title="Pengaturan" />

            <div className="mb-6">
                <Tabs
                    value={tab}
                    onChange={setTab}
                    tabs={[
                        { id: 'koneksi', label: '1 · Koneksi CHR' },
                        { id: 'jaringan', label: '2 · Jaringan & port' },
                        { id: 'paket', label: '3 · Paket langganan' },
                    ]}
                />
            </div>

            {tab === 'koneksi' && (
                <Panel
                    title="Endpoint CHR"
                    description="Pakai RouterOS API (port 8728), bukan SSH. Aktifkan /ip service enable api di CHR."
                    action={
                        <Badge status={chr.source === 'database' ? 'active' : 'draft'}>
                            {chr.source === 'database' ? 'Tersimpan di database' : 'Masih default'}
                        </Badge>
                    }
                >
                    <form className="space-y-4" onSubmit={saveChr}>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Host / IP CHR" error={chrForm.errors.host}>
                                <input
                                    className={inputClass()}
                                    value={chrForm.data.host}
                                    onChange={(e) => chrForm.setData('host', e.target.value)}
                                    autoComplete="off"
                                />
                            </Field>
                            <Field label="Port API" hint="Default 8728 · API-SSL 8729" error={chrForm.errors.port}>
                                <input
                                    type="number"
                                    className={inputClass()}
                                    value={chrForm.data.port}
                                    onChange={(e) => chrForm.setData('port', e.target.value)}
                                />
                            </Field>
                            <Field label="Username" error={chrForm.errors.username}>
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
                                    chr.has_password
                                        ? 'Kosongkan untuk mempertahankan password tersimpan'
                                        : 'Belum ada password tersimpan'
                                }
                                error={chrForm.errors.password}
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
                            <Field label="Public IP" hint="IP yang dilihat pelanggan" error={chrForm.errors.public_ip}>
                                <input
                                    className={inputClass()}
                                    value={chrForm.data.public_ip}
                                    onChange={(e) => chrForm.setData('public_ip', e.target.value)}
                                />
                            </Field>
                            <Field label="Default PPP profile" error={chrForm.errors.default_profile}>
                                <input
                                    className={inputClass()}
                                    value={chrForm.data.default_profile}
                                    onChange={(e) => chrForm.setData('default_profile', e.target.value)}
                                />
                            </Field>
                            <Field label="Timeout (detik)" error={chrForm.errors.timeout}>
                                <input
                                    type="number"
                                    className={inputClass()}
                                    value={chrForm.data.timeout}
                                    onChange={(e) => chrForm.setData('timeout', e.target.value)}
                                />
                            </Field>
                            <Field label="API-SSL" hint="Centang jika memakai port 8729">
                                <label className="flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm">
                                    <input
                                        type="checkbox"
                                        className={checkboxClass()}
                                        checked={!!chrForm.data.ssl}
                                        onChange={(e) => chrForm.setData('ssl', e.target.checked)}
                                    />
                                    Gunakan SSL (api-ssl)
                                </label>
                            </Field>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pt-2">
                            <Button type="submit" variant="teal" disabled={chrForm.processing || testing}>
                                {chrForm.processing ? 'Menyimpan…' : 'Simpan koneksi'}
                            </Button>
                            <Button
                                type="button"
                                variant="soft"
                                disabled={chrForm.processing || testing}
                                onClick={testConnection}
                            >
                                <PlugZap className={`h-4 w-4 ${testing ? 'animate-pulse' : ''}`} />
                                {testing ? 'Menguji…' : 'Test koneksi'}
                            </Button>
                            {chrForm.isDirty && <span className="text-xs text-amber">Ada perubahan belum disimpan</span>}
                        </div>
                    </form>
                </Panel>
            )}

            {tab === 'jaringan' && (
                <Panel
                    title="Alokasi IP & port block"
                    description="Dipakai saat membuat pelanggan baru. Public port = port block + offset layanan."
                >
                    <form className="space-y-5" onSubmit={saveChr}>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field label="Gateway tunnel" error={chrForm.errors.tunnel_gateway}>
                                <input
                                    className={inputClass('font-mono')}
                                    value={chrForm.data.tunnel_gateway}
                                    onChange={(e) => chrForm.setData('tunnel_gateway', e.target.value)}
                                />
                            </Field>
                            <Field label="Prefix jaringan" hint="Contoh 192.168.172" error={chrForm.errors.tunnel_network}>
                                <input
                                    className={inputClass('font-mono')}
                                    value={chrForm.data.tunnel_network}
                                    onChange={(e) => chrForm.setData('tunnel_network', e.target.value)}
                                />
                            </Field>
                            <Field label="Host awal" error={chrForm.errors.tunnel_start_host}>
                                <input
                                    type="number"
                                    className={inputClass()}
                                    value={chrForm.data.tunnel_start_host}
                                    onChange={(e) => chrForm.setData('tunnel_start_host', e.target.value)}
                                />
                            </Field>
                            <Field label="Host akhir" error={chrForm.errors.tunnel_end_host}>
                                <input
                                    type="number"
                                    className={inputClass()}
                                    value={chrForm.data.tunnel_end_host}
                                    onChange={(e) => chrForm.setData('tunnel_end_host', e.target.value)}
                                />
                            </Field>
                            <Field label="Port block awal" error={chrForm.errors.port_block_start}>
                                <input
                                    type="number"
                                    className={inputClass()}
                                    value={chrForm.data.port_block_start}
                                    onChange={(e) => chrForm.setData('port_block_start', e.target.value)}
                                />
                            </Field>
                            <Field label="Port block akhir" error={chrForm.errors.port_block_end}>
                                <input
                                    type="number"
                                    className={inputClass()}
                                    value={chrForm.data.port_block_end}
                                    onChange={(e) => chrForm.setData('port_block_end', e.target.value)}
                                />
                            </Field>
                            <Field label="Langkah block" hint="Jarak antar pelanggan, default 300" error={chrForm.errors.port_block_step}>
                                <input
                                    type="number"
                                    className={inputClass()}
                                    value={chrForm.data.port_block_step}
                                    onChange={(e) => chrForm.setData('port_block_step', e.target.value)}
                                />
                            </Field>
                        </div>

                        <div>
                            <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft/70">
                                Template layanan (offset dari port block)
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-ink/8">
                                <table className="w-full min-w-[480px] text-sm">
                                    <thead>
                                        <tr className="bg-ink/[0.03] text-[11px] uppercase tracking-wider text-ink-soft/60">
                                            <th className="px-3 py-2 text-left font-medium">Layanan</th>
                                            <th className="px-3 py-2 text-left font-medium">Port lokal</th>
                                            <th className="px-3 py-2 text-left font-medium">Offset publik</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-ink/6">
                                        {Object.entries(chrForm.data.service_templates || {}).map(([key, tpl]) => (
                                            <tr key={key}>
                                                <td className="px-3 py-2">
                                                    <input
                                                        className={inputClass()}
                                                        value={tpl.label || ''}
                                                        onChange={(e) =>
                                                            chrForm.setData('service_templates', {
                                                                ...chrForm.data.service_templates,
                                                                [key]: { ...tpl, label: e.target.value },
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        className={inputClass('font-mono')}
                                                        value={tpl.local_port || ''}
                                                        onChange={(e) =>
                                                            chrForm.setData('service_templates', {
                                                                ...chrForm.data.service_templates,
                                                                [key]: { ...tpl, local_port: Number(e.target.value) },
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="number"
                                                        className={inputClass('font-mono')}
                                                        value={tpl.offset || 0}
                                                        onChange={(e) =>
                                                            chrForm.setData('service_templates', {
                                                                ...chrForm.data.service_templates,
                                                                [key]: { ...tpl, offset: Number(e.target.value) },
                                                            })
                                                        }
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <Button type="submit" variant="teal" disabled={chrForm.processing}>
                            {chrForm.processing ? 'Menyimpan…' : 'Simpan jaringan'}
                        </Button>
                    </form>
                </Panel>
            )}

            {tab === 'paket' && (
                <div className="grid gap-6 xl:grid-cols-2">
                    <Panel title="Paket yang tersedia" description="Dipilih saat membuat pelanggan atau memperpanjang masa aktif.">
                        <div className="space-y-2">
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
                            {plans.length === 0 && <p className="text-sm text-ink-soft/70">Belum ada paket.</p>}
                        </div>
                    </Panel>

                    <Panel title="Tambah paket">
                        <form
                            className="space-y-3"
                            onSubmit={(e) => {
                                e.preventDefault();
                                planForm.post('/settings/plans', { onSuccess: () => planForm.reset() });
                            }}
                        >
                            <Field label="Nama paket" error={planForm.errors.name}>
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
                </div>
            )}
        </AdminLayout>
    );
}
