import type { Hit } from "../game/effects";
import { Shuriken } from "./Shuriken";

interface ShurikenZoneProps {
  playerId: number;
  pulseId: number;
  hits: readonly Hit[];
  /** Text of the popup that floats up from each strike. */
  hitLabel: string;
  onHitDone: (playerId: number, hitId: number) => void;
}

/** The spinning shuriken with its slash + popup effects, shared by Smash and Shadow Strike. */
export function ShurikenZone({ playerId, pulseId, hits, hitLabel, onHitDone }: ShurikenZoneProps) {
  return (
    <div className="shuriken-zone">
      <Shuriken pulseId={pulseId} />
      {hits.map((h) => (
        <div key={h.id} className="hit" style={{ left: `${h.x}%`, top: `${h.y}%` }}>
          <div className="slash" style={{ transform: `rotate(${h.rot}deg)` }} />
          <span className="plus" onAnimationEnd={() => onHitDone(playerId, h.id)}>
            {hitLabel}
          </span>
        </div>
      ))}
    </div>
  );
}
