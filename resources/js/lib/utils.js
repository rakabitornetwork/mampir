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

export function formatDateShort(value) {
    if (!value) return '—';
    return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    }).format(new Date(value));
}

export function relativeTime(value) {
    if (!value) return 'belum pernah';
    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    const minutes = Math.round(diff / 60000);
    if (minutes < 1) return 'baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.round(hours / 24);
    if (days < 14) return `${days} hari lalu`;
    return formatDate(value);
}

export function formatIDR(value) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value || 0));
}

export function statusLabel(status) {
    const map = {
        active: 'Aktif',
        online: 'Online',
        expired: 'Habis masa',
        suspended: 'Ditangguhkan',
        draft: 'Draf',
        success: 'Berhasil',
        failed: 'Gagal',
        error: 'Gagal',
        pending: 'Menunggu',
        on: 'Nyala',
        off: 'Mati',
        clean: 'Bersih',
        dirty: 'Berubah',
    };
    return map[status] || status || '—';
}

export function statusTone(status) {
    switch (status) {
        case 'active':
        case 'success':
        case 'on':
        case 'clean':
            return 'bg-teal-bright/12 text-teal border-teal/18';
        case 'online':
            return 'bg-sky/12 text-sky border-sky/18';
        case 'expired':
        case 'failed':
        case 'error':
        case 'off':
        case 'dirty':
            return 'bg-rose/10 text-rose border-rose/18';
        case 'suspended':
        case 'pending':
        case 'warning':
            return 'bg-amber/10 text-amber border-amber/18';
        default:
            return 'bg-ink/5 text-ink-soft border-ink/10';
    }
}

export function initials(name = '') {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'A';
}
