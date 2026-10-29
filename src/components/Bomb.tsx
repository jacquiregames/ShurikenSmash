import { memo, useId } from "react";

/** The bakudan. Remount it (via `key`) to replay the "caught it" arrival animation. */
export const Bomb = memo(function Bomb() {
  const id = useId();

  return (
    <svg className="bomb" viewBox="-60 -75 120 135" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`${id}-shell`} cx="35%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#6b7280" />
          <stop offset="35%" stopColor="#1f2937" />
          <stop offset="100%" stopColor="#030712" />
        </radialGradient>
      </defs>

      {/* Fuse */}
      <path
        d="M8,-38 C14,-52 26,-56 30,-66"
        stroke="#c8a165"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />

      {/* Spark */}
      <g className="bomb-spark" transform="translate(30,-66)">
        <circle r="7" fill="#ffc93c" />
        <circle r="3.5" fill="#fff" />
        {[0, 60, 120, 180, 240, 300].map((a) => (
          <line
            key={a}
            x1="0"
            y1="-9"
            x2="0"
            y2="-15"
            stroke="#ff822d"
            strokeWidth="2.5"
            strokeLinecap="round"
            transform={`rotate(${a})`}
          />
        ))}
      </g>

      {/* Cap */}
      <rect x="-6" y="-44" width="20" height="12" rx="2" fill="#374151" transform="rotate(20)" />

      {/* Shell */}
      <circle r="42" fill={`url(#${id}-shell)`} stroke="var(--c)" strokeWidth="2.5" />
      <ellipse cx="-14" cy="-16" rx="11" ry="7" fill="rgba(255,255,255,0.35)" transform="rotate(-35)" />

      {/* Kanji mark */}
      <text
        y="12"
        textAnchor="middle"
        fontFamily="'Noto Serif JP', serif"
        fontSize="32"
        fontWeight="900"
        fill="var(--c)"
        opacity="0.85"
      >
        爆
      </text>
    </svg>
  );
});
