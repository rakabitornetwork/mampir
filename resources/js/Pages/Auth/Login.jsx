import { Head, useForm } from '@inertiajs/react';
import { ArrowRight, Lock, ShieldCheck } from 'lucide-react';
import Logo from '@/Components/Logo';
import { Button, Field, inputClass } from '@/Components/UI';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: true,
    });

    return (
        <div className="relative min-h-screen overflow-hidden">
            <Head title="Masuk" />
            <div className="absolute inset-0 grid-fade opacity-60" />
            <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-teal-bright/20 blur-3xl" />
            <div className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-sky/15 blur-3xl" />

            <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-4 py-10">
                <div className="grid w-full items-center gap-10 lg:grid-cols-2">
                    <div className="hidden lg:block">
                        <div className="mb-8 flex items-center gap-3">
                            <Logo className="h-12 w-12" />
                            <div>
                                <div className="text-2xl font-semibold tracking-tight text-ink">Mampir</div>
                                <div className="text-xs uppercase tracking-[0.22em] text-teal">Tunnel Subscription</div>
                            </div>
                        </div>
                        <h1 className="max-w-md text-4xl font-semibold leading-tight tracking-tight text-ink">
                            Panel premium untuk tunnel L2TP berlangganan.
                        </h1>
                        <p className="mt-4 max-w-md text-ink-soft/80">
                            Kelola pelanggan CHR, generate script server/client, alokasi port acak dari pola
                            produksi, dan pantau masa aktif dalam satu tempat.
                        </p>
                        <div className="mt-8 flex items-center gap-3 text-sm text-ink-soft">
                            <ShieldCheck className="h-5 w-5 text-teal" />
                            Teslatech · Perwiracloud CHR
                        </div>
                    </div>

                    <div className="mesh-panel mx-auto w-full max-w-md rounded-3xl border border-ink/10 p-8 shadow-xl shadow-ink/5">
                        <div className="mb-6 flex items-center gap-3 lg:hidden">
                            <Logo />
                            <div className="font-semibold">Mampir</div>
                        </div>
                        <div className="mb-1 text-xs font-medium uppercase tracking-[0.18em] text-teal">Admin Access</div>
                        <h2 className="text-2xl font-semibold tracking-tight">Masuk ke panel</h2>
                        <p className="mt-1 text-sm text-ink-soft/75">Gunakan kredensial administrator TeslaTech.</p>

                        <form
                            className="mt-8 space-y-4"
                            onSubmit={(e) => {
                                e.preventDefault();
                                post('/login');
                            }}
                        >
                            <Field label="Email">
                                <input
                                    type="email"
                                    className={inputClass()}
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    autoFocus
                                    autoComplete="username"
                                />
                                {errors.email && <p className="text-xs text-rose">{errors.email}</p>}
                            </Field>
                            <Field label="Password">
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
                                {errors.password && <p className="text-xs text-rose">{errors.password}</p>}
                            </Field>
                            <label className="flex items-center gap-2 text-sm text-ink-soft">
                                <input
                                    type="checkbox"
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    className="rounded border-ink/20 text-teal focus:ring-teal/30"
                                />
                                Ingat sesi ini
                            </label>
                            <Button type="submit" variant="teal" className="w-full" disabled={processing}>
                                Masuk Panel
                                <ArrowRight className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
