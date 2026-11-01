import { memo, useEffect, useRef, type CSSProperties } from "react";
import { getRowImageUrl } from "../game/config";
import { STACK_COLS, STACK_ROWS } from "../game/stack";
import type { Row, StackPlayer } from "../game/types";
import { SakuraStorm, ShurikenBurst } from "./StackEffects";

interface StackFieldProps {
  playerId: number;
  stack: StackPlayer;
  /** Increments on every drop; replays the landing flash. */
  pulseId: number;
  onBurstDone: (playerId: number, burstId: number) => void;
}

/** Warm the cache so a block never shows up without its art. */
for (const width of [1, 2, 3]) {
  new Image().src = getRowImageUrl(width);
}

/** Positions a block as percentages so the field scales with its container. */
const blockStyle = ({ x, width }: Row, level: number): CSSProperties =>
  ({
    left: `${(x / STACK_COLS) * 100}%`,
    bottom: `${(level / STACK_ROWS) * 100}%`,
    width: `${(width / STACK_COLS) * 100}%`,
    height: `${100 / STACK_ROWS}%`,
    "--n": width,
  }) as CSSProperties;

/** Transparent row art stretched over the block; the player color shows through. */
const BlockArt = ({ width }: { width: number }) => (
  <img className="block-art" src={getRowImageUrl(width)} alt="" draggable={false} />
);

/** One player's tower: grid, placed blocks, the moving block and effects. */
export const StackField = memo(function StackField({
  playerId,
  stack,
  pulseId,
  onBurstDone,
}: StackFieldProps) {
  const { rows, current, status, bursts } = stack;
  const top = rows[rows.length - 1];
  const climbing = status === "climbing";
  const fieldRef = useRef<HTMLDivElement>(null);

  // Replay the landing flash on every drop without remounting the field.
  useEffect(() => {
    const field = fieldRef.current;
    if (!field || pulseId === 0) return;
    field.classList.remove("flash");
    void field.getBoundingClientRect(); // force reflow so the animation restarts
    field.classList.add("flash");
  }, [pulseId]);

  return (
    <div className="stack-wrap">
      <div ref={fieldRef} className={`stack-field is-${status}`}>
        {top && climbing && <div className="stack-block guide" style={blockStyle(top, rows.length)} />}

        {rows.map((row, level) => (
          <div key={level} className="stack-block placed" style={blockStyle(row, level)}>
            <BlockArt width={row.width} />
          </div>
        ))}

        {climbing && (
          <div className="stack-block moving" style={blockStyle(current, rows.length)}>
            <BlockArt width={current.width} />
            <div className="blade-sheen" />
          </div>
        )}

        {status === "fallen" && (
          <div className="stack-block missed" style={blockStyle(current, rows.length)}>
            <BlockArt width={current.width} />
          </div>
        )}

        {bursts.map((burst) => (
          <ShurikenBurst key={burst.id} burst={burst} playerId={playerId} onDone={onBurstDone} />
        ))}

        {status === "summit" && <SakuraStorm />}

        {!climbing && (
          <div className={`stack-overlay ${status}`}>
            <div className="stack-overlay-title">{status === "summit" ? "SUMMIT!" : "FALLEN"}</div>
          </div>
        )}
      </div>
    </div>
  );
});
