import { Head, Link, router, useForm } from '@inertiajs/react';
import { ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import { useState } from 'react';
import AdminLayout from '@/Layouts/AdminLayout';
import { Button, ConfirmDialog, Field, Panel, Stepper, checkboxClass, inputClass } from '@/Components/UI';

const steps = [
    { title: 'Identitas', hint: 'Nama, username PPP, dan kontak' },
    { title: 'Langganan', hint: 'Paket dan durasi masa aktif' },
    { title: 'Tunnel', hint: 'IP, port block, dan push ke CHR' },
];

export default function CustomerForm({ customer, plans, serviceTemplates, defaults }) {
    const isEdit = Boolean(customer?.id);
    const [step, setStep] = useState(1);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [stepError, setStepError] = useState('');
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

    const toggleService = (key) => {
        setData(
            'services',
            data.services.includes(key)
                ? data.services.filter((s) => s !== key)
                : [...data.services, key]
        );
    };

    const goNext = () => {
        if (step === 1) {
            if (!data.name.trim() || !data.username.trim()) {
                setStepError('Nama tampilan dan username PPP wajib diisi.');
                return;
            }
        }
        if (step === 2 && Number(data.duration_days) < 1) {
            setStepError('Durasi langganan minimal 1 hari.');
            return;
        }
        setStepError('');
        setStep((n) => Math.min(3, n + 1));
    };

    const submit = (e) => {
        e.preventDefault();
        if (!isEdit && step < 3) {
            goNext();
            return;
        }
        if (isEdit) {
            put(`/customers/${customer.id}`);
        } else {
            post('/customers');
        }
    };

    const identityFields = (
        <Panel title="Identitas pelanggan" description="Username PPP dipakai sebagai secret L2TP di CHR — jangan diganti setelah dibuat.">
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama tampilan" error={errors.name}>
                    <input className={inputClass()} value={data.name} onChange={(e) => setData('name', e.target.value)} />
                </Field>
                <Field label="Username PPP" hint="Huruf/angka tanpa spasi" error={errors.username}>
                    <input
                        className={inputClass('font-mono')}
                        value={data.username}
                        onChange={(e) => setData('username', e.target.value)}
                        disabled={isEdit}
                    />
                </Field>
                <Field label="Password tunnel" hint="Kosongkan untuk auto-generate">
                    <input
                        className={inputClass('font-mono')}
                        value={data.password}
                        onChange={(e) => setData('password', e.target.value)}
                        placeholder="Otomatis jika kosong"
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
    );

    const planFields = (
        <Panel title="Langganan" description="Setiap pelanggan bisa punya durasi berbeda. Bisa diubah lagi nanti dari halaman detail.">
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
                <Field label="Durasi (hari)">
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
    );

    const tunnelFields = (
        <Panel title="Alokasi tunnel & port" description="Port publik = port block + offset. Contoh: block 1400 → SSH 1422, HTTP 1480, Winbox 1691.">
            <div className="mb-4 rounded-xl border border-teal/20 bg-teal/5 px-4 py-3 text-sm text-ink-soft">
                Biarkan alokasi acak kecuali Anda butuh block atau IP tertentu. Centang push agar secret & NAT langsung masuk CHR.
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl border border-ink/8 bg-white px-3.5 py-2.5 text-sm">
                    <input
                        type="checkbox"
                        className={checkboxClass()}
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
                <Field label="Remote address (opsional)" hint="Kosongkan = IP berikutnya di jaringan tunnel" className="sm:col-span-2">
                    <input
                        className={inputClass('font-mono')}
                        value={data.remote_address}
                        onChange={(e) => setData('remote_address', e.target.value)}
                        placeholder="192.168.172.11"
                    />
                </Field>
            </div>
            <div className="mt-4">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-ink-soft/70">Layanan port</div>
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
                    className={checkboxClass()}
                    checked={data.push_to_chr}
                    onChange={(e) => setData('push_to_chr', e.target.checked)}
                />
                Langsung push konfigurasi ke CHR setelah dibuat
            </label>
        </Panel>
    );

    return (
        <AdminLayout
            title={isEdit ? 'Edit pelanggan' : 'Pelanggan baru'}
            subtitle={
                isEdit
                    ? 'Perbarui identitas dan status. Tunnel & port diubah dari detail setelah sync.'
                    : 'Tiga langkah: siapa pelanggannya, berapa lama aktif, lalu alokasi tunnel.'
            }
            crumbs={[
                { href: '/customers', label: 'Pelanggan' },
                { label: isEdit ? 'Edit' : 'Baru' },
            ]}
        >
            <Head title={isEdit ? 'Edit pelanggan' : 'Pelanggan baru'} />

            <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
                {!isEdit && <Stepper steps={steps} current={step} />}

                {isEdit && identityFields}
                {!isEdit && step === 1 && identityFields}
                {!isEdit && step === 2 && planFields}
                {!isEdit && step === 3 && tunnelFields}

                {stepError && <p className="text-sm text-rose">{stepError}</p>}

                <div className="flex items-center justify-between gap-2">
                    {isEdit ? (
                        <Button type="button" variant="danger" onClick={() => setConfirmDelete(true)} disabled={processing}>
                            <Trash2 className="h-4 w-4" />
                            Hapus pelanggan
                        </Button>
                    ) : step > 1 ? (
                        <Button type="button" variant="soft" onClick={() => setStep((n) => n - 1)}>
                            <ArrowLeft className="h-4 w-4" />
                            Kembali
                        </Button>
                    ) : (
                        <Link href="/customers">
                            <Button type="button" variant="ghost">
                                Batal
                            </Button>
                        </Link>
                    )}

                    {isEdit ? (
                        <Button type="submit" variant="teal" disabled={processing}>
                            Simpan perubahan
                        </Button>
                    ) : step < 3 ? (
                        <Button type="button" variant="teal" onClick={goNext}>
                            Lanjut
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button type="submit" variant="teal" disabled={processing}>
                            Buat pelanggan
                        </Button>
                    )}
                </div>
            </form>

            <ConfirmDialog
                open={confirmDelete}
                title={`Hapus ${customer?.name}?`}
                body="Akun, sesi aktif, PPP secret, dan NAT rules di MikroTik CHR akan dihapus."
                onCancel={() => setConfirmDelete(false)}
                onConfirm={() => router.delete(`/customers/${customer.id}`)}
            />
        </AdminLayout>
    );
}
