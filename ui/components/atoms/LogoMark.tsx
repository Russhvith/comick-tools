import { useId } from "react";

/**
 * The app's mark: a speech bubble (comics) holding a prompt (tools). Kept
 * in step with app/icon.svg, which is the same drawing used as the favicon.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  // Gradient ids are document wide, so each copy needs its own.
  const id = useId();
  const tile = `${id}-tile`;
  const shine = `${id}-shine`;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden focusable="false">
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id={shine} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".22" />
          <stop offset=".55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill={`url(#${tile})`} />
      <rect width="32" height="32" rx="8" fill={`url(#${shine})`} />
      <path
        d="M11 7.5h10a4 4 0 0 1 4 4v5.5a4 4 0 0 1-4 4h-6l-4.25 3.75V21A4 4 0 0 1 7 17v-5.5a4 4 0 0 1 4-4z"
        fill="#fff"
        fillOpacity=".14"
        stroke="#fff"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path d="M11.75 11.75l2.75 2.5-2.75 2.5" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16.75 16.75h3.75" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}
