interface LogoProps {
  size?: number;
  className?: string;
}

/**
 * The PennyTrack logo: a coin/penny shape with an upward trend, rendered as an
 * inline SVG so it scales crisply and needs no asset pipeline.
 */
export function Logo({ size = 32, className = "" }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      role="img"
      aria-label="PennyTrack"
    >
      <defs>
        <linearGradient id="pt-grad" x1="8" y1="6" x2="40" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#35D39A" />
          <stop offset="1" stopColor="#6EA8FE" />
        </linearGradient>
      </defs>
      <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#pt-grad)" opacity="0.16" />
      <rect x="4" y="4" width="40" height="40" rx="12" stroke="url(#pt-grad)" strokeWidth="2" />
      {/* Trend line going up */}
      <path
        d="M13 31L21 23L27 29L35 19"
        stroke="url(#pt-grad)"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="35" cy="19" r="2.6" fill="#35D39A" />
      {/* Penny "P" accent */}
      <path
        d="M16 34V17H23"
        stroke="#F4F7FC"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.0"
      />
    </svg>
  );
}
