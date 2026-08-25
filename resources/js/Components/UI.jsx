import { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { cn, statusLabel, statusTone } from '@/lib/utils';

export function StatCard({ label, value, hint, icon: Icon, tone = 'teal' }) {
    const tones = {
        teal: 'from-teal/12 via-transparent to-transparent text-teal',
        sky: 'from-sky/12 via-transparent to-transparent text-sky',
        amber: 'from-amber/12 via-transparent to-transparent text-amber',
        rose: 'from-rose/10 via-transparent to-transparent text-rose',
        ink: 'from-ink/8 via-transparent to-transparent text-ink',
        gold: 'from-gold/12 via-transparent to-transparent text-gold',
    };

    return (
        <div className="surface relative overflow-hidden rounded-2xl p-5 transition duration-300 hover:-translate-y-0.5">
            <div className={cn('pointer-events-none absolute inset-0 bg-gradient-to-br', tones[tone] || tones.teal)} />
            <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft/70">{label}</div>
                    <div className="mt-2 truncate text-3xl font-semibold tracking-tight text-ink tabular">{value}</div>
                    {hint && <div className="mt-1 text-xs text-ink-soft/70">{hint}</div>}
                </div>
                {Icon && (
                    <div className="rounded-xl bg-white/80 p-2.5 shadow-sm ring-1 ring-ink/5">
                        <Icon className="h-5 w-5 text-ink/80" />
                    </div>
                )}
            </div>
        </div>
    );
}

export function Badge({ status, children, pulse = false }) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide',
                statusTone(status)
            )}
        >
            {pulse && <span className="pulse-dot relative h-1.5 w-1.5 rounded-full bg-current" />}
            {children || statusLabel(status)}
        </span>
    );
}

export function Panel({ title, description, action, children, className, padded = true }) {
    return (
        <section className={cn('surface rounded-2xl', className)}>
            {(title || action) && (
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink/6 px-5 py-4">
                    <div className="min-w-0">
                        {title && <h2 className="text-sm font-semibold tracking-tight text-ink">{title}</h2>}
                        {description && <p className="mt-0.5 text-xs text-ink-soft/70">{description}</p>}
                    </div>
                    {action}
                </div>
            )}
            <div className={padded ? 'p-5' : ''}>{children}</div>
        </section>
    );
}

export function Button({ as: Comp = 'button', variant = 'primary', className, children, ...props }) {
    const variants = {
        primary: 'bg-ink text-white hover:bg-ink-mid shadow-sm',
        teal: 'bg-teal text-white hover:bg-teal/90 shadow-sm shadow-teal/20',
        soft: 'bg-white text-ink border border-ink/10 hover:bg-mist/80',
        danger: 'bg-rose text-white hover:bg-rose/90 shadow-sm',
        ghost: 'text-ink-soft hover:bg-ink/5',
        gold: 'bg-gold text-white hover:bg-gold/90 shadow-sm shadow-gold/20',
    };

    return (
        <Comp
            className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </Comp>
    );
}

export function Field({ label, children, hint, className, error }) {
    return (
        <label className={cn('block space-y-1.5', className)}>
            {label && (
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft/70">{label}</span>
            )}
            {children}
            {error && <span className="block text-xs text-rose">{error}</span>}
            {hint && !error && <span className="block text-xs text-ink-soft/60">{hint}</span>}
        </label>
    );
}

export function inputClass(extra = '') {
    return cn(
        'w-full rounded-xl border border-ink/10 bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink/30 focus:border-teal/40 focus:ring-2 focus:ring-teal/12',
        extra
    );
}

export function checkboxClass() {
    return 'h-4 w-4 rounded border-ink/20 text-teal focus:ring-teal/30';
}

export function CodeBlock({ code, onCopy, label = 'RouterOS Script' }) {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        onCopy?.();
        setTimeout(() => setCopied(false), 1800);
    };

    return (
        <div className="relative overflow-hidden rounded-2xl border border-ink/80 bg-[#08141c]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                <span className="font-mono text-[11px] uppercase tracking-wider text-teal-bright/80">{label}</span>
                <button
                    type="button"
                    onClick={copy}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1 text-xs text-white transition hover:bg-white/15"
                >
                    {copied ? <Check className="h-3.5 w-3.5 text-teal-bright" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Tersalin' : 'Salin'}
                </button>
            </div>
            <pre className="max-h-[420px] overflow-auto p-4 font-mono text-[12px] leading-relaxed text-mist/90">
                {code}
            </pre>
        </div>
    );
}

export function EmptyState({ icon: Icon, title, description, action }) {
    return (
        <div className="flex flex-col items-center px-6 py-14 text-center">
            {Icon && (
                <div className="mb-4 rounded-2xl bg-ink/4 p-3.5">
                    <Icon className="h-7 w-7 text-ink/35" />
                </div>
            )}
            <h3 className="text-sm font-semibold text-ink">{title}</h3>
            {description && <p className="mt-1.5 max-w-sm text-sm text-ink-soft/70">{description}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export function Tabs({ tabs, value, onChange }) {
    return (
        <div className="flex flex-wrap gap-1 rounded-2xl border border-ink/8 bg-white/70 p-1">
            {tabs.map((tab) => {
                const active = tab.id === value;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={cn(
                            'rounded-xl px-3.5 py-2 text-sm font-medium transition',
                            active ? 'bg-ink text-white shadow-sm' : 'text-ink-soft hover:bg-ink/5 hover:text-ink'
                        )}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}

export function Stepper({ steps, current }) {
    return (
        <ol className="grid gap-2 sm:grid-cols-3">
            {steps.map((step, index) => {
                const n = index + 1;
                const done = n < current;
                const active = n === current;
                return (
                    <li
                        key={step.title}
                        className={cn(
                            'rounded-2xl border px-4 py-3',
                            active
                                ? 'border-teal/30 bg-teal/8'
                                : done
                                  ? 'border-ink/8 bg-white'
                                  : 'border-ink/6 bg-white/50'
                        )}
                    >
                        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-soft/70">
                            <span
                                className={cn(
                                    'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold',
                                    active || done ? 'bg-teal text-white' : 'bg-ink/8 text-ink-soft'
                                )}
                            >
                                {done ? '✓' : n}
                            </span>
                            Langkah {n}
                        </div>
                        <div className="mt-1.5 text-sm font-semibold text-ink">{step.title}</div>
                        {step.hint && <p className="mt-0.5 text-xs text-ink-soft/70">{step.hint}</p>}
                    </li>
                );
            })}
        </ol>
    );
}

export function InfoItem({ label, value, mono = false, copy = false }) {
    const [copied, setCopied] = useState(false);
    const display = value || '—';

    const handleCopy = async () => {
        if (!value || !copy) return;
        await navigator.clipboard.writeText(String(value));
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
    };

    return (
        <div>
            <div className="text-[11px] uppercase tracking-wider text-ink-soft/55">{label}</div>
            <button
                type="button"
                onClick={handleCopy}
                disabled={!copy || !value}
                className={cn(
                    'mt-0.5 text-left text-sm text-ink',
                    mono && 'font-mono',
                    copy && value && 'hover:text-teal'
                )}
                title={copy ? 'Salin' : undefined}
            >
                {copied ? 'Tersalin' : display}
            </button>
        </div>
    );
}

export function ConfirmDialog({ open, title, body, confirmLabel = 'Hapus', variant = 'danger', onConfirm, onCancel }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button type="button" className="absolute inset-0 bg-ink/50 backdrop-blur-[2px]" onClick={onCancel} />
            <div className="surface relative w-full max-w-md rounded-2xl p-6">
                <button
                    type="button"
                    onClick={onCancel}
                    className="absolute right-4 top-4 rounded-lg p-1 text-ink-soft hover:bg-ink/5"
                >
                    <X className="h-4 w-4" />
                </button>
                <h3 className="pr-8 text-lg font-semibold tracking-tight text-ink">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft/80">{body}</p>
                <div className="mt-6 flex justify-end gap-2">
                    <Button type="button" variant="soft" onClick={onCancel}>
                        Batal
                    </Button>
                    <Button type="button" variant={variant} onClick={onConfirm}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function WorkflowCard({ steps }) {
    return (
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => {
                const Icon = step.icon;
                const state = step.state || (step.done ? 'done' : 'wait');
                return (
                    <li key={step.title} className="surface relative overflow-hidden rounded-2xl p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                                {index + 1}
                            </span>
                            {state === 'done' && <Badge status="active">Selesai</Badge>}
                            {state === 'now' && <Badge status="pending">Sekarang</Badge>}
                            {state === 'wait' && <Badge status="draft">Berikutnya</Badge>}
                        </div>
                        {Icon && <Icon className="mb-3 h-5 w-5 text-teal" />}
                        <div className="text-sm font-semibold text-ink">{step.title}</div>
                        <p className="mt-1 text-xs leading-relaxed text-ink-soft/75">{step.description}</p>
                        {step.action}
                    </li>
                );
            })}
        </ol>
    );
}
