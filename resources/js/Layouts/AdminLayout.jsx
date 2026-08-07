import { Link, useForm, usePage } from '@inertiajs/react';
import {
    Activity,
    Cable,
    CloudDownload,
    LayoutDashboard,
    LogOut,
    RefreshCw,
    ScrollText,
    Settings2,
    Users,
} from 'lucide-react';
import Logo from '@/Components/Logo';
import { cn } from '@/lib/utils';

const nav = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, routeName: 'dashboard' },
    { href: '/customers', label: 'Pelanggan', icon: Users, routeName: 'customers.index' },
    { href: '/scripts', label: 'Script Generator', icon: ScrollText, routeName: 'scripts.index' },
    { href: '/sync', label: 'Sinkron CHR', icon: RefreshCw, routeName: 'sync.index' },
    { href: '/update', label: 'Update', icon: CloudDownload, routeName: 'update.index' },
    { href: '/settings', label: 'Pengaturan', icon: Settings2, routeName: 'settings.index' },
];

export default function AdminLayout({ children, title, subtitle }) {
    const page = usePage();
    const { auth, flash, app } = page.props;
    const current = page.url || '';
    const logout = useForm({});

    return (
        <div className="min-h-screen">
            <div className="mx-auto flex min-h-screen max-w-[1440px]">
                <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-ink/8 bg-ink px-4 py-6 text-mist lg:flex">
                    <div className="mb-10 flex items-center gap-3 px-2">
                        <Logo className="h-10 w-10" />
                        <div>
                            <div className="text-sm font-semibold tracking-wide text-white">Mampir</div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-teal-bright/80">
                                Tunnel Panel
                            </div>
                        </div>
                    </div>

                    <nav className="flex flex-1 flex-col gap-1">
                        {nav.map((item) => {
                            const active =
                                item.href === '/'
                                    ? current === '/'
                                    : current.startsWith(item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                                        active
                                            ? 'bg-teal/25 text-white shadow-[inset_0_0_0_1px_rgba(20,184,166,0.35)]'
                                            : 'text-mist/70 hover:bg-white/5 hover:text-white'
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            'h-4 w-4',
                                            active ? 'text-teal-bright' : 'text-mist/50 group-hover:text-teal-bright'
                                        )}
                                    />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-mist/50">
                            <Cable className="h-3.5 w-3.5 text-teal-bright" />
                            CHR Endpoint
                        </div>
                        <div className="font-mono text-sm text-white">{app?.public_ip}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-mist/50">
                            <Activity className="h-3 w-3 text-teal-bright" />
                            L2TP · Port Forward
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => logout.post('/logout')}
                        className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-mist/60 transition hover:bg-white/5 hover:text-white"
                    >
                        <LogOut className="h-4 w-4" />
                        Keluar
                    </button>
                </aside>

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-20 border-b border-ink/8 bg-paper/80 px-4 py-4 backdrop-blur-md sm:px-8">
                        <div className="flex flex-wrap items-end justify-between gap-4">
                            <div>
                                <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-teal">
                                    Teslatech · Perwiracloud
                                </div>
                                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
                                {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-soft/80">{subtitle}</p>}
                            </div>
                            <div className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-sm text-ink-soft">
                                {auth?.user?.email}
                            </div>
                        </div>

                        {(flash?.success || flash?.error || flash?.warning) && (
                            <div className="mt-4 space-y-2">
                                {flash.success && (
                                    <div className="rounded-xl border border-teal/20 bg-teal/10 px-4 py-2.5 text-sm text-teal">
                                        {flash.success}
                                    </div>
                                )}
                                {flash.error && (
                                    <div className="rounded-xl border border-rose/20 bg-rose/10 px-4 py-2.5 text-sm text-rose">
                                        {flash.error}
                                    </div>
                                )}
                                {flash.warning && (
                                    <div className="rounded-xl border border-amber/20 bg-amber/10 px-4 py-2.5 text-sm text-amber">
                                        {flash.warning}
                                    </div>
                                )}
                            </div>
                        )}
                    </header>

                    <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
                </div>
            </div>
        </div>
    );
}
