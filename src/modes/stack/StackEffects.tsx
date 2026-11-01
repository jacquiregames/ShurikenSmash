import { memo, type CSSProperties } from "react";
import { unit } from "../../shared/game/random";
import { STACK_COLS, STACK_ROWS } from "./stack";
import type { Burst } from "./types";

const PARTICLES = 10;

interface ShurikenBurstProps {
  burst: Burst;
  playerId: number;
  onDone: (playerId: number, burstId: number) => void;
}

/** Shuriken burst played each time a block lands. Removes itself when finished. */
export const ShurikenBurst = memo(function ShurikenBurst({
  burst,
  playerId,
  onDone,
}: ShurikenBurstProps) {
  const stars = Array.from({ length: PARTICLES }, (_, i) => {
    const seed = burst.id * 31 + i * 7;
    const angle = (i / PARTICLES) * Math.PI * 2 + unit(seed) * 0.5;
    const dist = 26 + unit(seed + 1) * 34;
    return {
      id: i,
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist * 0.7 - 10,
      size: 8 + unit(seed + 2) * 6,
      tone: i % 3 === 0 ? "#e8e8f0" : i % 2 ? "var(--c)" : "var(--a)",
      spin: (360 + unit(seed + 3) * 540) * (i % 2 ? 1 : -1),
      delay: unit(seed + 4) * 50,
    };
  });

  return (
    <div
      className="stack-burst"
      style={{
        left: `${(burst.cx / STACK_COLS) * 100}%`,
        top: `${((STACK_ROWS - burst.level - 0.5) / STACK_ROWS) * 100}%`,
      }}
      onAnimationEnd={(e) => {
        // Only the container's own lifetime animation ends the burst.
        if (e.target === e.currentTarget) onDone(playerId, burst.id);
      }}
    >
      <div className="stack-burst-ring" />
      {stars.map((s) => (
        <div
          key={s.id}
          className="stack-shuriken-bit"
          style={
            {
              width: s.size,
              height: s.size,
              background: s.tone,
              "--dx": `${s.dx}px`,
              "--dy": `${s.dy}px`,
              "--spin": `${s.spin}deg`,
              animationDelay: `${s.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
});

const PETAL_TONES = ["#ffc0d3", "#ff9fbf", "#ffe3ec", "#ffd700"];

// Decorative and random, so it is generated once at module load.
const PETALS = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  delay: Math.random() * 1200,
  dur: 1800 + Math.random() * 1600,
  size: 8 + Math.random() * 6,
  drift: (Math.random() - 0.5) * 120,
  tone: PETAL_TONES[i % PETAL_TONES.length],
}));

/** Sakura petals that rain down on a summit. */
export const SakuraStorm = memo(function SakuraStorm() {
  return (
    <div className="stack-storm" aria-hidden="true">
      {PETALS.map((p) => (
        <div
          key={p.id}
          className="stack-storm-petal"
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 0.75,
              background: p.tone,
              animationDuration: `${p.dur}ms`,
              animationDelay: `${p.delay}ms`,
              "--drift": `${p.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
});
