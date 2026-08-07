export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}

export function formatDate(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}

export function formatIDR(value) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
}

export function statusTone(status) {
    switch (status) {
        case 'active':
            return 'bg-teal-bright/15 text-teal border-teal/20';
        case 'online':
            return 'bg-sky/15 text-sky border-sky/20';
        case 'expired':
            return 'bg-rose/10 text-rose border-rose/20';
        case 'suspended':
            return 'bg-amber/10 text-amber border-amber/20';
        default:
            return 'bg-ink/5 text-ink-soft border-ink/10';
    }
}
