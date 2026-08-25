import { Link, useForm, usePage } from '@inertiajs/react';
import {
    Activity,
    Cable,
    CloudDownload,
    LayoutDashboard,
    LogOut,
    Menu,
    RefreshCw,
    ScrollText,
    Settings2,
    Users,
    X,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import Logo from '@/Components/Logo';
import { cn, initials } from '@/lib/utils';

const groups = [
    {
        label: 'Hari ini',
        items: [
            { href: '/', label: 'Dashboard', icon: LayoutDashboard, hint: 'Ringkasan & alur kerja' },
            { href: '/customers', label: 'Pelanggan', icon: Users, hint: 'Akun tunnel & masa aktif' },
        ],
    },
    {
        label: 'RouterOS',
        items: [
            { href: '/scripts', label: 'Script Generator', icon: ScrollText, hint: 'Script server & client' },
            { href: '/sync', label: 'Sinkron CHR', icon: RefreshCw, hint: 'Tarik data dari MikroTik' },
        ],
    },
    {
        label: 'Sistem',
        items: [
            { href: '/settings', label: 'Pengaturan', icon: Settings2, hint: 'Koneksi CHR & paket' },
            { href: '/update', label: 'Update', icon: CloudDownload, hint: 'Tarik versi terbaru' },
        ],
    },
];

function isActive(current, href) {
    if (href === '/') return current === '/' || current === '';
    return current === href || current.startsWith(`${href}/`) || current.startsWith(`${href}?`);
}

function NavList({ current, onNavigate }) {
    return (
        <nav className="flex flex-1 flex-col gap-6 overflow-y-auto pr-1">
            {groups.map((group) => (
                <div key={group.label}>
                    <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-mist/35">
                        {group.label}
                    </div>
                    <div className="flex flex-col gap-0.5">
                        {group.items.map((item) => {
                            const active = isActive(current, item.href);
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={onNavigate}
                                    className={cn(
                                        'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition',
                                        active
                                            ? 'bg-white/10 text-white'
                                            : 'text-mist/65 hover:bg-white/5 hover:text-white'
                                    )}
                                >
                                    {active && (
                                        <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-teal-bright" />
                                    )}
                                    <Icon
                                        className={cn(
                                            'h-4 w-4 shrink-0',
                                            active ? 'text-teal-bright' : 'text-mist/40 group-hover:text-teal-bright'
                                        )}
                                    />
                                    <span className="min-w-0">
                                        <span className="block leading-tight">{item.label}</span>
                                        <span className="block truncate text-[11px] text-mist/35 group-hover:text-mist/50">
                                            {item.hint}
                                        </span>
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}

function FlashToasts({ flash, onDismiss }) {
    const items = [
        flash?.success && { type: 'success', text: flash.success },
        flash?.error && { type: 'error', text: flash.error },
        flash?.warning && { type: 'warning', text: flash.warning },
    ].filter(Boolean);

    if (items.length === 0) return null;

    return (
        <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[min(100%-2rem,24rem)] flex-col gap-2">
            {items.map((item) => (
                <div
                    key={`${item.type}-${item.text}`}
                    className={cn(
                        'pointer-events-auto toast-in flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur-md',
                        item.type === 'success' && 'border-teal/20 bg-white/95 text-teal',
                        item.type === 'error' && 'border-rose/20 bg-white/95 text-rose',
                        item.type === 'warning' && 'border-amber/20 bg-white/95 text-amber'
                    )}
                >
                    <p className="flex-1 leading-relaxed">{item.text}</p>
                    <button
                        type="button"
                        onClick={onDismiss}
                        className="rounded-lg p-0.5 text-current/60 hover:bg-ink/5"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            ))}
        </div>
    );
}

export default function AdminLayout({ children, title, subtitle, crumbs = [] }) {
    const page = usePage();
    const { auth, flash, app } = page.props;
    const current = page.url || '';
    const logout = useForm({});
    const [open, setOpen] = useState(false);
    const [flashVisible, setFlashVisible] = useState(true);
    const chrReady = Boolean(app?.chr_configured);
    const onSettings = current.startsWith('/settings');

    useEffect(() => {
        setFlashVisible(true);
        if (!flash?.success && !flash?.error && !flash?.warning) return undefined;
        const timer = setTimeout(() => setFlashVisible(false), 5200);
        return () => clearTimeout(timer);
    }, [flash?.success, flash?.error, flash?.warning, page.url]);

    const sidebar = (
        <>
            <div className="mb-8 flex items-center gap-3 px-2">
                <Logo className="h-10 w-10" />
                <div>
                    <div className="text-sm font-semibold tracking-wide text-white">Mampir</div>
                    <div className="text-[11px] uppercase tracking-[0.18em] text-teal-bright/75">Tunnel Panel</div>
                </div>
            </div>

            <NavList current={current} onNavigate={() => setOpen(false)} />

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wider text-mist/45">
                    <span className="inline-flex items-center gap-1.5">
                        <Cable className="h-3.5 w-3.5 text-teal-bright" />
                        Endpoint CHR
                    </span>
                    <span className={cn('h-1.5 w-1.5 rounded-full', chrReady ? 'bg-teal-bright pulse-dot relative' : 'bg-amber')} />
                </div>
                <div className="font-mono text-sm text-white">{app?.public_ip || 'Belum di-set'}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-mist/45">
                    <Activity className="h-3 w-3 text-teal-bright" />
                    {chrReady ? 'API siap · L2TP & NAT' : 'Hubungkan CHR di Pengaturan'}
                </div>
            </div>

            <button
                type="button"
                onClick={() => logout.post('/logout')}
                className="mt-4 flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-mist/55 transition hover:bg-white/5 hover:text-white"
            >
                <LogOut className="h-4 w-4" />
                Keluar
            </button>
        </>
    );

    return (
        <div className="min-h-screen">
            {flashVisible && <FlashToasts flash={flash} onDismiss={() => setFlashVisible(false)} />}

            <div className="mx-auto flex min-h-screen max-w-[1500px]">
                <aside className="surface-ink sticky top-0 hidden h-screen w-[272px] shrink-0 flex-col px-4 py-6 text-mist lg:flex">
                    {sidebar}
                </aside>

                {open && (
                    <div className="fixed inset-0 z-40 lg:hidden">
                        <button type="button" className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
                        <aside className="surface-ink absolute inset-y-0 left-0 flex w-[min(100%,18rem)] flex-col px-4 py-6 text-mist shadow-2xl">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="mb-4 self-end rounded-lg p-1.5 text-mist/60 hover:bg-white/10"
                            >
                                <X className="h-5 w-5" />
                            </button>
                            {sidebar}
                        </aside>
                    </div>
                )}

                <div className="flex min-w-0 flex-1 flex-col">
                    <header className="sticky top-0 z-20 border-b border-ink/8 bg-paper/80 px-4 py-4 backdrop-blur-md sm:px-8">
                        <div className="flex items-start gap-3">
                            <button
                                type="button"
                                className="mt-1 rounded-xl border border-ink/10 bg-white p-2 text-ink lg:hidden"
                                onClick={() => setOpen(true)}
                            >
                                <Menu className="h-4 w-4" />
                            </button>
                            <div className="min-w-0 flex-1">
                                {crumbs.length > 0 && (
                                    <nav className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft/60">
                                        <Link href="/" className="hover:text-ink">
                                            Dashboard
                                        </Link>
                                        {crumbs.map((crumb, idx) => (
                                            <span key={`${crumb.label}-${idx}`} className="flex items-center gap-1.5">
                                                <span>/</span>
                                                {crumb.href ? (
                                                    <Link href={crumb.href} className="hover:text-ink">
                                                        {crumb.label}
                                                    </Link>
                                                ) : (
                                                    <span className="text-ink/80">{crumb.label}</span>
                                                )}
                                            </span>
                                        ))}
                                    </nav>
                                )}
                                <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-gold">
                                    Teslatech · Perwiracloud
                                </div>
                                <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{title}</h1>
                                {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-soft/80">{subtitle}</p>}
                            </div>
                            <div className="hidden items-center gap-2 rounded-full border border-ink/10 bg-white/80 py-1.5 pl-1.5 pr-4 sm:flex">
                                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
                                    {initials(auth?.user?.name || auth?.user?.email)}
                                </span>
                                <span className="max-w-[180px] truncate text-sm text-ink-soft">{auth?.user?.email}</span>
                            </div>
                        </div>

                        {!chrReady && !onSettings && (
                            <Link
                                href="/settings"
                                className="mt-4 flex items-start gap-3 rounded-2xl border border-amber/20 bg-amber/8 px-4 py-3 text-sm text-ink"
                            >
                                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-amber" />
                                <span>
                                    <strong className="font-semibold">Langkah 1 — hubungkan CHR.</strong>{' '}
                                    Isi host API, username, dan password di Pengaturan supaya pelanggan bisa di-sync dan di-push.
                                </span>
                            </Link>
                        )}
                    </header>

                    <main className="flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
                </div>
            </div>
        </div>
    );
}
