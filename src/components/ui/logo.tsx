interface LogoProps {
  className?: string;
  showText?: boolean;
}

export function Logo({ className = '', showText = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Sunrise icon */}
      <svg
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0"
      >
        {/* Sun rays */}
        <g className="text-[#E85D4C]">
          <path d="M20 8V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M20 12V10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M28 12L30 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M12 12L10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M32 16L35 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 16L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M25 10L27 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M15 10L13 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        {/* Horizon/base */}
        <path
          d="M6 24C6 24 10 18 20 18C30 18 34 24 34 24"
          stroke="#1E3A5F"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <rect x="4" y="26" width="32" height="3" rx="1.5" fill="#1E3A5F" />
        <rect x="6" y="31" width="28" height="2" rx="1" fill="#1E3A5F" opacity="0.6" />
        <rect x="10" y="35" width="20" height="1.5" rx="0.75" fill="#1E3A5F" opacity="0.3" />
      </svg>

      {/* Text */}
      {showText && (
        <div className="flex flex-col leading-none">
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-[#1E3A5F] uppercase">
            My
          </span>
          <span className="text-lg sm:text-xl font-bold tracking-wide text-[#1E3A5F] uppercase -mt-0.5">
            Daily
          </span>
          <span className="text-[10px] sm:text-xs font-semibold tracking-[0.15em] text-[#1E3A5F] uppercase -mt-0.5">
            Brief
          </span>
        </div>
      )}
    </div>
  );
}
