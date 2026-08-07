export default function Logo({ className = 'h-9 w-9' }) {
    return (
        <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <rect width="64" height="64" rx="16" fill="#0F1C24" />
            <path
                d="M14 34c8-14 28-14 36 0"
                stroke="#14B8A6"
                strokeWidth="3.5"
                strokeLinecap="round"
            />
            <path
                d="M20 38c5.5-8 18.5-8 24 0"
                stroke="#0284C7"
                strokeWidth="3"
                strokeLinecap="round"
                opacity="0.85"
            />
            <circle cx="32" cy="24" r="4.5" fill="#14B8A6" />
            <circle cx="18" cy="36" r="3" fill="#E8EEF1" />
            <circle cx="46" cy="36" r="3" fill="#E8EEF1" />
            <path d="M32 28.5V42" stroke="#E8EEF1" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
    );
}
