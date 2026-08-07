import { cn, statusTone } from '@/lib/utils';

export function StatCard({ label, value, hint, icon: Icon, tone = 'teal' }) {
    const tones = {
        teal: 'from-teal/15 to-transparent text-teal',
        sky: 'from-sky/15 to-transparent text-sky',
        amber: 'from-amber/15 to-transparent text-amber',
        rose: 'from-rose/15 to-transparent text-rose',
        ink: 'from-ink/10 to-transparent text-ink',
    };

    return (
        <div className="mesh-panel relative overflow-hidden rounded-2xl border border-ink/8 p-5 shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-80', tones[tone])} />
            <div className="relative flex items-start justify-between gap-3">
                <div>
                    <div className="text-xs font-medium uppercase tracking-[0.14em] text-ink-soft/70">{label}</div>
                    <div className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</div>
                    {hint && <div className="mt-1 text-xs text-ink-soft/70">{hint}</div>}
                </div>
                {Icon && (
                    <div className="rounded-xl bg-white/70 p-2.5 shadow-sm">
                        <Icon className="h-5 w-5 text-ink" />
                    </div>
                )}
            </div>
        </div>
    );
}

export function Badge({ status, children }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide',
                statusTone(status)
            )}
        >
            {children || status}
        </span>
    );
}

export function Panel({ title, action, children, className }) {
    return (
        <section className={cn('mesh-panel rounded-2xl border border-ink/8 shadow-sm', className)}>
            {(title || action) && (
                <div className="flex items-center justify-between gap-3 border-b border-ink/6 px-5 py-4">
                    <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>
                    {action}
                </div>
            )}
            <div className="p-5">{children}</div>
        </section>
    );
}

export function Button({ as: Comp = 'button', variant = 'primary', className, children, ...props }) {
    const variants = {
        primary: 'bg-ink text-white hover:bg-ink-soft',
        teal: 'bg-teal text-white hover:bg-teal/90',
        soft: 'bg-white text-ink border border-ink/10 hover:bg-mist',
        danger: 'bg-rose text-white hover:bg-rose/90',
        ghost: 'text-ink-soft hover:bg-ink/5',
    };

    return (
        <Comp
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:opacity-50',
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </Comp>
    );
}

export function Field({ label, children, hint }) {
    return (
        <label className="block space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-ink-soft/70">{label}</span>
            {children}
            {hint && <span className="block text-xs text-ink-soft/60">{hint}</span>}
        </label>
    );
}

export function inputClass(extra = '') {
    return cn(
        'w-full rounded-xl border border-ink/10 bg-white/80 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/30 focus:border-teal/40 focus:ring-2 focus:ring-teal/15',
        extra
    );
}

export function CodeBlock({ code, onCopy }) {
    return (
        <div className="relative overflow-hidden rounded-2xl border border-ink/80 bg-[#0f1c24]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                <span className="font-mono text-[11px] uppercase tracking-wider text-teal-bright/80">RouterOS Script</span>
                <button
                    type="button"
                    onClick={() => {
                        navigator.clipboard.writeText(code);
                        onCopy?.();
                    }}
                    className="rounded-lg bg-white/10 px-3 py-1 text-xs text-white transition hover:bg-white/15"
                >
                    Salin
                </button>
            </div>
            <pre className="max-h-[420px] overflow-auto p-4 font-mono text-[12px] leading-relaxed text-mist/90">
                {code}
            </pre>
        </div>
    );
}
