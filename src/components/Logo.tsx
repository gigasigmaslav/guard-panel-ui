interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: { icon: 22, gap: '0.45rem', fontSize: '0.95rem' },
  md: { icon: 28, gap: '0.55rem', fontSize: '1.15rem' },
  lg: { icon: 44, gap: '0.75rem', fontSize: '1.65rem' },
} as const;

export function Logo({ size = 'md', className }: LogoProps) {
  const s = SIZES[size];

  return (
    <span
      className={`gp-logo${className ? ` ${className}` : ''}`}
      style={{ gap: s.gap }}
    >
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 40 40"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="gp-shield-grad" x1="20" y1="2" x2="20" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--gp-accent)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <path
          d="M20 3L6 9.5v10c0 9.2 5.8 15.2 14 18.5 8.2-3.3 14-9.3 14-18.5v-10L20 3z"
          fill="url(#gp-shield-grad)"
          opacity="0.18"
        />
        <path
          d="M20 3L6 9.5v10c0 9.2 5.8 15.2 14 18.5 8.2-3.3 14-9.3 14-18.5v-10L20 3z"
          stroke="var(--gp-accent)"
          strokeWidth="1.6"
          fill="none"
        />
        <path
          d="M14 20.5l4.5 4.5 7.5-9"
          stroke="var(--gp-accent)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
      <span className="gp-logo-text" style={{ fontSize: s.fontSize }}>
        <span className="gp-logo-guard">Guard</span>
        <span className="gp-logo-panel">Panel</span>
      </span>
    </span>
  );
}
