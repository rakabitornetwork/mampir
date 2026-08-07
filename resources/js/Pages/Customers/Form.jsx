import { Head, router, useForm } from '@inertiajs/react';
import { Trash2 } from 'lucide-react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button, Field, Panel, inputClass } from '@/Components/UI';

export default function CustomerForm({ customer, plans, serviceTemplates, defaults }) {
    const isEdit = Boolean(customer?.id);
    const { data, setData, post, put, processing, errors } = useForm({
        name: customer?.name || '',
        username: customer?.username || '',
        password: customer?.password || '',
        email: customer?.email || '',
        phone: customer?.phone || '',
        company: customer?.company || '',
        notes: customer?.notes || '',
        status: customer?.status || 'active',
        plan_id: plans?.[1]?.id || plans?.[0]?.id || '',
        duration_days: defaults?.duration_days || 30,
        allocate_random_block: defaults?.allocate_random_block ?? true,
        port_block: customer?.port_block || '',
        remote_address: customer?.remote_address || '',
        services: defaults?.services || Object.keys(serviceTemplates || {}),
        push_to_chr: defaults?.push_to_chr || false,
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

    const toggleService = (key) => {
        setData(
            'services',
            data.services.includes(key)
                ? data.services.filter((s) => s !== key)
                : [...data.services, key]
        );
    };

    const submit = (e) => {
        e.preventDefault();
        if (isEdit) {
            put(`/customers/${customer.id}`);
        } else {
            post('/customers');
        }
    };

    return (
        <AdminLayout
            title={isEdit ? 'Edit pelanggan' : 'Pelanggan baru'}
            subtitle={
                isEdit
                    ? 'Perbarui identitas dan status pelanggan.'
                    : 'Alokasi remote IP + port block acak mengikuti pola CHR produksi.'
            }
        >
            <Head title={isEdit ? 'Edit pelanggan' : 'Pelanggan baru'} />

            <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
                <Panel title="Identitas">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Nama tampilan">
                            <input className={inputClass()} value={data.name} onChange={(e) => setData('name', e.target.value)} />
                            {errors.name && <p className="text-xs text-rose">{errors.name}</p>}
                        </Field>
                        <Field label="Username PPP" hint="Dipakai sebagai secret L2TP di CHR">
                            <input
                                className={inputClass('font-mono')}
                                value={data.username}
                                onChange={(e) => setData('username', e.target.value)}
                                disabled={isEdit}
                            />
                            {errors.username && <p className="text-xs text-rose">{errors.username}</p>}
                        </Field>
                        <Field label="Password tunnel">
                            <input
                                className={inputClass('font-mono')}
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="Kosongkan untuk auto-generate"
                            />
                        </Field>
                        <Field label="Perusahaan">
                            <input className={inputClass()} value={data.company} onChange={(e) => setData('company', e.target.value)} />
                        </Field>
                        <Field label="Email">
                            <input className={inputClass()} value={data.email} onChange={(e) => setData('email', e.target.value)} />
                        </Field>
                        <Field label="Telepon">
                            <input className={inputClass()} value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                        </Field>
                        <Field label="Catatan" className="sm:col-span-2">
                            <textarea
                                className={inputClass('min-h-24')}
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                            />
                        </Field>
                        {isEdit && (
                            <Field label="Status">
                                <select className={inputClass()} value={data.status} onChange={(e) => setData('status', e.target.value)}>
                                    {['active', 'expired', 'suspended', 'draft'].map((s) => (
                                        <option key={s} value={s}>
                                            {s}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        )}
                    </div>
                </Panel>

                {!isEdit && (
                    <>
                        <Panel title="Langganan">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Paket">
                                    <select
                                        className={inputClass()}
                                        value={data.plan_id}
                                        onChange={(e) => {
                                            const id = e.target.value;
                                            setData('plan_id', id);
                                            const plan = plans.find((p) => String(p.id) === String(id));
                                            if (plan) setData('duration_days', plan.duration_days);
                                        }}
                                    >
                                        <option value="">Custom</option>
                                        {plans.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} · {p.duration_days} hari
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <Field label="Durasi (hari)" hint="Setiap pelanggan bisa punya masa aktif berbeda">
                                    <input
                                        type="number"
                                        min="1"
                                        className={inputClass()}
                                        value={data.duration_days}
                                        onChange={(e) => setData('duration_days', e.target.value)}
                                    />
                                </Field>
                            </div>
                        </Panel>

                        <Panel title="Alokasi tunnel & port">
                            <div className="mb-4 rounded-xl border border-teal/20 bg-teal/5 px-4 py-3 text-sm text-ink-soft">
                                Pola standar CHR: block base + offset (
                                <span className="font-mono text-ink">+22 SSH, +80 HTTP, +187 OLT, +228 API, +291 Winbox</span>
                                ). Port block dipilih acak dari slot yang belum terpakai.
                            </div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={data.allocate_random_block}
                                        onChange={(e) => setData('allocate_random_block', e.target.checked)}
                                    />
                                    Alokasi port block acak
                                </label>
                                {!data.allocate_random_block && (
                                    <Field label="Port block manual">
                                        <input
                                            type="number"
                                            className={inputClass('font-mono')}
                                            value={data.port_block}
                                            onChange={(e) => setData('port_block', e.target.value)}
                                        />
                                    </Field>
                                )}
                                <Field label="Remote address (opsional)" hint="Kosongkan = IP berikutnya di 192.168.172.x">
                                    <input
                                        className={inputClass('font-mono')}
                                        value={data.remote_address}
                                        onChange={(e) => setData('remote_address', e.target.value)}
                                        placeholder="192.168.172.11"
                                    />
                                </Field>
                            </div>
                            <div className="mt-4">
                                <div className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-soft/70">Layanan port</div>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(serviceTemplates || {}).map(([key, tpl]) => (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => toggleService(key)}
                                            className={`rounded-full border px-3 py-1.5 text-xs ${
                                                data.services.includes(key)
                                                    ? 'border-teal bg-teal text-white'
                                                    : 'border-ink/10 bg-white text-ink-soft'
                                            }`}
                                        >
                                            {tpl.label} :{tpl.local_port}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <label className="mt-5 flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={data.push_to_chr}
                                    onChange={(e) => setData('push_to_chr', e.target.checked)}
                                />
                                Langsung push konfigurasi ke CHR setelah dibuat
                            </label>
                        </Panel>
                    </>
                )}

                <div className="flex items-center justify-between gap-2">
                    {isEdit ? (
                        <Button type="button" variant="danger" onClick={handleDelete} disabled={processing}>
                            <Trash2 className="h-4 w-4" />
                            Hapus pelanggan
                        </Button>
                    ) : <div />}
                    <Button type="submit" variant="teal" disabled={processing}>
                        {isEdit ? 'Simpan perubahan' : 'Buat pelanggan'}
                    </Button>
                </div>
            </form>
        </AdminLayout>
    );
}
