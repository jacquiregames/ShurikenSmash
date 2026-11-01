import { memo, useSyncExternalStore } from "react";
import type { Clock, Phase } from "../../shared/game/types";
import { counterAt, formatNumber, isBust } from "./tsugitashi";

interface TsugitashiCounterProps {
  phase: Phase;
  clock: Clock;
  target: number;
  /** Full round length: the clock counts down from this to the moment the counter busts. */
  durationMs: number;
}

/** The one shared counter everybody is racing, with the target above it. */
export const TsugitashiCounter = memo(function TsugitashiCounter({
  phase,
  clock,
  target,
  durationMs,
}: TsugitashiCounterProps) {
  const timeLeft = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
  const started = phase !== "countdown";
  const value = started ? counterAt(durationMs - timeLeft) : 0;
  const bust = started && isBust(value, target);
  // The final value stays up through the post-round hold, then is removed once the results
  // cards show, which frees its space so the cards grow.
  const showValue = phase !== "results";

  return (
    <div className={`tsugi-counter ${bust ? "tsugi-bust" : ""}`}>
      <div className="tsugi-target">
        <span className="tsugi-target-label">Target</span>
        <span className="tsugi-target-value">{started ? formatNumber(target) : "???"}</span>
      </div>
      {showValue && <div className="tsugi-value">{formatNumber(value)}</div>}
    </div>
  );
});