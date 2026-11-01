import { memo, useEffect, useId, useRef } from "react";

interface ShurikenProps {
  /** Increments on every strike; each change replays the whirl animation. */
  pulseId: number;
}

export const Shuriken = memo(function Shuriken({ pulseId }: ShurikenProps) {
  // Unique ID prefix so gradients/filters never collide across multiple player cards
  const id = useId();
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || pulseId === 0) return;
    // Restart the CSS animation in place instead of remounting the filtered SVG.
    svg.classList.remove("idle", "spin");
    void svg.getBoundingClientRect(); // force reflow so the animation restarts
    svg.classList.add("spin");
  }, [pulseId]);

  return (
    <svg
      ref={svgRef}
      className="shuriken idle"
      viewBox="-120 -120 240 240"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Steel blade highlights */}
        <linearGradient id={`${id}-steel-bright`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="35%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>

        {/* Steel blade shadows */}
        <linearGradient id={`${id}-steel-dark`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="60%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Edge razor bevel */}
        <linearGradient id={`${id}-razor-edge`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Center hub metallic gradient */}
        <radialGradient id={`${id}-hub-gradient`} cx="40%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <stop offset="30%" stopColor="#475569" />
          <stop offset="80%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#090d16" />
        </radialGradient>

        {/* Glow filter for energy accents */}
        <filter id={`${id}-energy-glow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Atmospheric Energy Aura */}
      <circle
        r="78"
        className="shuriken-aura"
        stroke="var(--c)"
        strokeWidth="1.5"
        strokeDasharray="4 8"
        fill="none"
        opacity="0.45"
      />

      <g className="shuriken-body">
        {/* 4 Curved Deadly Blades */}
        {[0, 90, 180, 270].map((angle) => (
          <g key={angle} transform={`rotate(${angle})`}>
            {/* Primary Sharp Blade Face (Light facet) */}
            <path
              d="M0,-14 C12,-32 18,-60 12,-108 C6,-68 -4,-38 0,-14 Z"
              fill={`url(#${id}-steel-bright)`}
            />

            {/* Chiseled Bevel / Counter Face (Shadow facet) */}
            <path
              d="M0,-14 C-4,-38 6,-68 12,-108 C-14,-62 -24,-30 0,-14 Z"
              fill={`url(#${id}-steel-dark)`}
            />

            {/* Razor Edge Tip Gleam */}
            <path d="M12,-108 L9,-65 L12,-63 Z" fill={`url(#${id}-razor-edge)`} opacity="0.9" />

            {/* Blood-Groove (Fuller / Hi) Detail */}
            <path
              d="M2,-32 C5,-50 8,-72 8,-88"
              stroke="var(--c)"
              strokeWidth="1.8"
              strokeLinecap="round"
              fill="none"
              filter={`url(#${id}-energy-glow)`}
            />

            {/* Secondary aerodynamic vent / cutout notch */}
            <polygon points="0,-24 4,-38 0,-34 -4,-38" fill="#080511" opacity="0.75" />
          </g>
        ))}

        {/* Outer Hub Bezel Ring with Player Theme Color */}
        <circle
          r="26"
          fill="none"
          stroke="var(--c)"
          strokeWidth="3"
          filter={`url(#${id}-energy-glow)`}
        />

        {/* Heavy Steel Center Hub */}
        <circle r="23" fill={`url(#${id}-hub-gradient)`} stroke="#64748b" strokeWidth="1" />

        {/* Engraved Center Plate */}
        <circle r="16" fill="#0a0512" stroke="var(--c)" strokeWidth="1.5" opacity="0.85" />

        {/* 4 Rivets / Shuriken Balance Pins */}
        {[45, 135, 225, 315].map((ang) => (
          <circle
            key={ang}
            cx={19 * Math.cos((ang * Math.PI) / 180)}
            cy={19 * Math.sin((ang * Math.PI) / 180)}
            r="1.8"
            fill="#e2e8f0"
            stroke="#0f172a"
            strokeWidth="0.6"
          />
        ))}

        {/* Aerodynamic Center Hole (Kouga / Iga style) */}
        <circle r="8.5" fill="#040208" stroke="#334155" strokeWidth="1.2" />

        {/* Inner Hole Bevel highlight */}
        <circle r="7" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
      </g>
    </svg>
  );
});
