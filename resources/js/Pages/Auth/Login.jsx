import { Head, useForm } from '@inertiajs/react';
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import Logo from '@/Components/Logo';
import { Button, Field, inputClass } from '@/Components/UI';

const highlights = [
    { n: '01', title: 'Hubungkan CHR', text: 'Satu koneksi API ke MikroTik untuk seluruh pelanggan.' },
    { n: '02', title: 'Kelola langganan', text: 'Masa aktif, port block, dan status online dalam satu panel.' },
    { n: '03', title: 'Kirim script siap pakai', text: 'Generator server & client RouterOS, lalu push ke CHR.' },
];

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: true,
    });

    return (
        <div className="relative min-h-screen overflow-hidden">
            <Head title="Masuk" />
            <div className="absolute inset-0 grid-fade opacity-50" />

            <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
                <div className="grid w-full overflow-hidden rounded-[28px] border border-ink/8 bg-white/70 shadow-[0_30px_80px_-40px_rgba(8,20,28,0.45)] lg:grid-cols-2">
                    <div className="surface-ink relative hidden overflow-hidden p-10 text-mist lg:flex lg:flex-col">
                        <div className="pointer-events-none absolute -right-16 -top-10 h-56 w-56 rounded-full bg-teal/30 blur-3xl" />
                        <div className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-gold/20 blur-3xl" />
                        <div className="relative mb-12 flex items-center gap-3">
                            <Logo className="h-12 w-12" light />
                            <div>
                                <div className="text-xl font-semibold tracking-tight text-white">Mampir</div>
                                <div className="text-[11px] uppercase tracking-[0.22em] text-teal-bright/80">Tunnel Subscription</div>
                            </div>
                        </div>
                        <h1 className="relative max-w-md text-4xl font-semibold leading-tight tracking-tight text-white">
                            Panel admin untuk tunnel L2TP berlangganan.
                        </h1>
                        <p className="relative mt-4 max-w-md text-sm leading-relaxed text-mist/70">
                            Alurnya sederhana: hubungkan CHR, isi pelanggan, ambil script, lalu push. Pantau siapa yang online dan kapan masa aktif habis.
                        </p>
                        <div className="relative mt-10 space-y-4">
                            {highlights.map((item) => (
                                <div key={item.n} className="flex gap-4 rounded-2xl border border-white/8 bg-white/5 p-4">
                                    <div className="font-mono text-xs text-gold">{item.n}</div>
                                    <div>
                                        <div className="text-sm font-medium text-white">{item.title}</div>
                                        <div className="mt-0.5 text-xs text-mist/60">{item.text}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="relative mt-auto flex items-center gap-2 pt-10 text-xs text-mist/50">
                            <ShieldCheck className="h-4 w-4 text-teal-bright" />
                            Teslatech · Perwiracloud CHR
                        </div>
                    </div>

                    <div className="relative bg-white p-8 sm:p-10">
                        <div className="mb-8 flex items-center gap-3 lg:hidden">
                            <Logo />
                            <div className="font-semibold">Mampir</div>
                        </div>
                        <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-gold">Akses admin</div>
                        <h2 className="text-2xl font-semibold tracking-tight text-ink">Masuk ke panel</h2>
                        <p className="mt-1 text-sm text-ink-soft/75">Gunakan kredensial administrator TeslaTech.</p>

                        <form
                            className="mt-8 space-y-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                post('/login');
                            }}
                        >
                            <Field label="Email" error={errors.email}>
                                <input
                                    type="email"
                                    className={inputClass()}
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    autoFocus
                                    autoComplete="username"
                                />
                            </Field>
                            <Field label="Password" error={errors.password}>
                                <div className="relative">
                                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/30" />
                                    <input
                                        type="password"
                                        className={inputClass('pl-10')}
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        autoComplete="current-password"
                                    />
                                </div>
                            </Field>
                            <label className="flex items-center gap-2 text-sm text-ink-soft">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="h-4 w-4 rounded border-ink/20 text-teal focus:ring-teal/30"
                                />
                                Ingat sesi ini
                            </label>
                            <Button type="submit" variant="teal" className="w-full" disabled={processing}>
                                Masuk panel
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
