import { useId } from "react";

export function Shuriken({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <path
        d="M24 2 L28.6 17.2 L44 6 L33.6 20.4 L48 24 L33.6 27.6 L44 42 L28.6 30.8 L24 46 L19.4 30.8 L4 42 L14.4 27.6 L0 24 L14.4 20.4 L4 6 L19.4 17.2 Z"
        fill="currentColor"
        opacity="0.95"
      />
      <circle cx="24" cy="24" r="4.8" fill="#0b0d14" />
      <circle cx="24" cy="24" r="4.8" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />
    </svg>
  );
}

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
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 120 32" className={className} aria-hidden="true" style={{ overflow: "visible" }}>
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
        <path d="M4 16 L22 8 L38 14.5" stroke="rgba(255,255,255,0.85)" strokeWidth="1" fill="none" />
        <line x1="2" y1="16" x2="40" y2="16" stroke="rgba(30,35,45,0.6)" strokeWidth="0.8" />

        {/* Blade collar / Habaki */}
        <rect x="39" y="11.8" width="5" height="8.4" rx="1" fill="#c49a45" stroke="#7a5a1c" strokeWidth="0.6" />

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
          <g className="kunai-tassel" opacity="0.85">
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

/** Authentic Japanese Straw Kasumi-Mato (Target) with woven rope rim and golden bullseye center */
export function Mato() {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 220 220" aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        {/* Straw weave texture / shadow */}
        <radialGradient id={`rim${id}`} cx="48%" cy="42%" r="62%">
          <stop offset="0%" stopColor="#6d4f32" />
          <stop offset="70%" stopColor="#432f1c" />
          <stop offset="100%" stopColor="#1a110a" />
        </radialGradient>
        {/* Outer wood/board texture */}
        <radialGradient id={`face${id}`} cx="45%" cy="38%" r="75%">
          <stop offset="0%" stopColor="#fdf8ed" />
          <stop offset="55%" stopColor="#f1e5cc" />
          <stop offset="100%" stopColor="#c8b792" />
        </radialGradient>
        {/* Gold Bullseye Sunburst */}
        <radialGradient id={`goldBull${id}`} cx="42%" cy="38%" r="65%">
          <stop offset="0%" stopColor="#fff8db" />
          <stop offset="35%" stopColor="#f8ca4d" />
          <stop offset="75%" stopColor="#d8941e" />
          <stop offset="100%" stopColor="#875708" />
        </radialGradient>
        <filter id={`bullGlow${id}`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f8ca4d" floodOpacity="0.8" />
        </filter>
      </defs>

      {/* Hanging rope cords from ceiling beams */}
      <path
        d="M48 24 Q110 50 172 24"
        fill="none"
        stroke="#4a3520"
        strokeWidth="4"
        strokeDasharray="4 2"
        opacity="0.7"
      />
      <path
        d="M48 24 Q110 50 172 24"
        fill="none"
        stroke="#c4a26e"
        strokeWidth="2.2"
        strokeDasharray="3 3"
        opacity="0.8"
      />

      {/* Outer rice-straw braided rim (Wara) */}
      <circle cx="110" cy="110" r="105" fill={`url(#rim${id})`} />
      <circle cx="110" cy="110" r="105" fill="none" stroke="#120c07" strokeWidth="2.5" />

      {/* Woven straw radiating coils */}
      <g stroke="rgba(244, 218, 170, 0.22)" strokeWidth="1.2">
        {Array.from({ length: 48 }, (_, i) => {
          const a = (i / 48) * Math.PI * 2;
          return (
            <line
              key={i}
              x1={110 + Math.cos(a) * 95}
              y1={110 + Math.sin(a) * 95}
              x2={110 + Math.cos(a + 0.12) * 104}
              y2={110 + Math.sin(a + 0.12) * 104}
            />
          );
        })}
      </g>

      {/* Target surface (Base Parchment) */}
      <circle cx="110" cy="110" r="94" fill={`url(#face${id})`} />

      {/* Authentic Kasumi Rings: Outer Black/Blue, Red, White, Gold Center */}
      {/* Outer Ring: Deep Indigo/Ink */}
      <circle cx="110" cy="110" r="94" fill="none" stroke="#253549" strokeWidth="8" opacity="0.9" />
      <circle cx="110" cy="110" r="88" fill="none" stroke="#161a22" strokeWidth="2" />

      {/* Outer-Mid Ring (Azure / Ink) */}
      <circle cx="110" cy="110" r="70" fill="none" stroke="#314f6f" strokeWidth="8" />
      <circle cx="110" cy="110" r="64" fill="none" stroke="#121820" strokeWidth="2.2" />

      {/* Mid Ring: Crimson Vermilion (朱) */}
      <circle cx="110" cy="110" r="46" fill="none" stroke="#c0382b" strokeWidth="8.5" />
      <circle cx="110" cy="110" r="40" fill="none" stroke="#781d14" strokeWidth="2" />

      {/* Inner Ring: Pure Ink border */}
      <circle cx="110" cy="110" r="23" fill="none" stroke="#181410" strokeWidth="5.5" />

      {/* Bullseye Gold Disk (的中) */}
      <circle
        cx="110"
        cy="110"
        r="9"
        fill={`url(#goldBull${id})`}
        stroke="#fff1b8"
        strokeWidth="1.2"
        filter={`url(#bullGlow${id})`}
      />
      {/* Bullseye tiny center dot and glint */}
      <circle cx="110" cy="110" r="2.2" fill="#3d2102" />
      <circle cx="108" cy="108" r="1.6" fill="#ffffff" opacity="0.95" />

      {/* Subtle crosshair guide lines */}
      <g stroke="rgba(24, 20, 16, 0.25)" strokeWidth="0.8" strokeDasharray="2 3">
        <line x1="110" y1="18" x2="110" y2="202" />
        <line x1="18" y1="110" x2="202" y2="110" />
      </g>
    </svg>
  );
}

export function SoundOn() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

export function SoundOff() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M17 9.5l4 5" />
      <path d="M21 9.5l-4 5" />
    </svg>
  );
}
