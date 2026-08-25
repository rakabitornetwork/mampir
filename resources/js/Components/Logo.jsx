export default function Logo({ className = 'h-9 w-9', light = false }) {
    return (
        <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <rect width="64" height="64" rx="18" fill={light ? '#0F766E' : '#08141C'} />
            <path
                d="M13 36c9.5-16 28.5-16 38 0"
                stroke="#14B8A6"
                strokeWidth="3.2"
                strokeLinecap="round"
            />
            <path
                d="M19 40c6-9 20-9 26 0"
                stroke="#B08948"
                strokeWidth="2.4"
                strokeLinecap="round"
                opacity="0.9"
            />
            <circle cx="32" cy="23" r="4.2" fill="#14B8A6" />
            <circle cx="17" cy="38" r="2.6" fill="#E6EEF1" />
            <circle cx="47" cy="38" r="2.6" fill="#E6EEF1" />
            <path d="M32 27.2V44" stroke="#E6EEF1" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
    );
}
