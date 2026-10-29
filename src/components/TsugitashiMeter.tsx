import { memo, useSyncExternalStore } from "react";
import type { Clock } from "../game/types";
import { formatNumber, holdAmount, isBust } from "../game/tsugitashi";

interface TsugitashiMeterProps {
  /** Banked total from finished presses. */
  banked: number;
  target: number;
  /** When the button went down, while it is held. */
  pressedAt?: number;
  clock: Clock;
  startedAt: number | null;
  roundMs: number;
}

/** A player's running total, counting up live while their button is held. */
export const TsugitashiMeter = memo(function TsugitashiMeter({
  banked,
  target,
  pressedAt,
  clock,
  startedAt,
  roundMs,
}: TsugitashiMeterProps) {
  const timeLeft = useSyncExternalStore(clock.subscribe, clock.getSnapshot);
  const now = (startedAt ?? 0) + roundMs - timeLeft;
  const holding = pressedAt !== undefined && startedAt !== null;
  const live = holding ? banked + holdAmount(now - pressedAt) : banked;

  const bust = isBust(live, target);
  const exact = live === target;
  const fill = target > 0 ? Math.min(1, live / target) : 0;

  return (
    <div className={`tsugi-meter ${bust ? "tsugi-bust" : ""} ${exact ? "tsugi-exact" : ""} ${holding ? "tsugi-holding" : ""}`}>
      <div className="tsugi-value">{formatNumber(live)}</div>
      <div className="tsugi-bar">
        <div className="tsugi-fill" style={{ width: `${fill * 100}%` }} />
      </div>
      <div className="tsugi-status">
        {bust ? "BUST!" : exact ? "EXACT!" : `${formatNumber(target - live)} to go`}
      </div>
    </div>
  );
});
