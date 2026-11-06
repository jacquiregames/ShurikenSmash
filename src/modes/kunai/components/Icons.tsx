import { useId } from "react";

/** Authentic forged steel kunai with engraved kanji, colored silk grip wrap, and trailing cloth tassel */
export function Kunai({
  color,
  className,
  tassel = false,
}: {
  color: string;
  className?: string;
  tassel?: boolean;
}) {
  // React ids contain characters (":", "«", "_") that are awkward inside url(#…).
  const id = useId().replace(/[^\w-]/g, "");
  return (
    <svg
      viewBox="0 0 120 32"
      className={className}
      aria-hidden="true"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`st${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="38%" stopColor="#cfd7e3" />
          <stop offset="52%" stopColor="#98a3b2" />
          <stop offset="100%" stopColor="#3c434f" />
        </linearGradient>
        <linearGradient id={`edge${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#a3b1c2" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id={`ir${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#485162" />
          <stop offset="45%" stopColor="#222834" />
          <stop offset="100%" stopColor="#0d1016" />
        </linearGradient>
        <filter id={`glow${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#000" floodOpacity="0.75" />
        </filter>
      </defs>

      <g filter={`url(#glow${id})`}>
        {/* Blade: sharpened leaf-shaped steel with central ridge */}
        <path d="M2 16 L22 4.5 L40 12.8 L40 19.2 L22 27.5 Z" fill={`url(#st${id})`} />
        {/* Top facet highlight */}
        <path d="M2 16 L22 4.5 L40 12.8 L22 16 Z" fill="rgba(255,255,255,0.22)" />
        {/* Central spine ridge */}
        <path
          d="M4 16 L22 8 L38 14.5"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="1"
          fill="none"
        />
        <line x1="2" y1="16" x2="40" y2="16" stroke="rgba(30,35,45,0.6)" strokeWidth="0.8" />

        {/* Blade collar / Habaki */}
        <rect
          x="39"
          y="11.8"
          width="5"
          height="8.4"
          rx="1"
          fill="#c49a45"
          stroke="#7a5a1c"
          strokeWidth="0.6"
        />

        {/* Shaft / Tang */}
        <rect x="43" y="13.2" width="42" height="5.6" rx="1.5" fill={`url(#ir${id})`} />

        {/* Traditional Tsuka-ito diamond silk cord wrapping */}
        <g stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.98">
          <line x1="48" y1="11.5" x2="52.5" y2="20.5" />
          <line x1="55" y1="11.5" x2="59.5" y2="20.5" />
          <line x1="62" y1="11.5" x2="66.5" y2="20.5" />
          <line x1="69" y1="11.5" x2="73.5" y2="20.5" />
          <line x1="76" y1="11.5" x2="80.5" y2="20.5" />
        </g>
        <g stroke="#ffffff" strokeWidth="0.9" opacity="0.4" strokeLinecap="round">
          <line x1="48" y1="12" x2="52.5" y2="20" />
          <line x1="55" y1="12" x2="59.5" y2="20" />
          <line x1="62" y1="12" x2="66.5" y2="20" />
          <line x1="69" y1="12" x2="73.5" y2="20" />
          <line x1="76" y1="12" x2="80.5" y2="20" />
        </g>

        {/* Ring pommel */}
        <circle cx="94" cy="16" r="9" fill="none" stroke={`url(#ir${id})`} strokeWidth="5.5" />
        <circle cx="94" cy="16" r="9" fill="none" stroke={color} strokeWidth="1.8" opacity="0.85" />
        <line x1="84" y1="16" x2="89" y2="16" stroke={color} strokeWidth="2.8" />

        {/* Optional trailing tassel ribbons for embedded kunai */}
        {tassel && (
          <g opacity="0.85">
            <path
              d="M98 16 Q106 14 114 20 Q122 26 128 22"
              fill="none"
              stroke={color}
              strokeWidth="2.2"
              strokeLinecap="round"
            />
            <path
              d="M98 17 Q108 21 116 18 Q124 15 130 24"
              fill="none"
              stroke="#f4ead6"
              strokeWidth="1.4"
              strokeLinecap="round"
              opacity="0.75"
            />
          </g>
        )}
      </g>
    </svg>
  );
}
