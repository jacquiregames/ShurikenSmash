import { memo, useSyncExternalStore } from "react";
import type { Clock, Phase } from "../game/types";

interface TimerProps {
  phase: Phase;
  clock: Clock;
  /** Full round length, used for the idle display and the progress bar. */
  durationMs: number;
  /** Hide the digits and bar once the time left drops to `belowMs`, showing `label` instead. */
  conceal?: { belowMs: number; label: string };
}

const formatSeconds = (ms: number) => (ms / 1000).toFixed(2);

export const Timer = memo(function Timer({ phase, clock, durationMs, conceal }: TimerProps) {
  const timeLeft = useSyncExternalStore(clock.subscribe, clock.getSnapshot);

  const isPlaying = phase === "playing";
  const isConcealed = conceal !== undefined && isPlaying && timeLeft <= conceal.belowMs;
  const isPostRound = phase === "video" || phase === "ended" || phase === "results";
  const showLive = isPlaying || isPostRound;

  const displayTime = isConcealed ? conceal.label : formatSeconds(showLive ? timeLeft : durationMs);
  const widthPct = isConcealed ? 0 : showLive ? (timeLeft / durationMs) * 100 : 100;
  const isDanger = !isConcealed && timeLeft < 3000;

  return (
    <div className="timer-wrap">
      <div className={`timer-text ${isConcealed ? "blind-hidden" : ""}`}>{displayTime}</div>
      <div className="timer-bar">
        <div
          className={`timer-fill ${isDanger ? "danger" : ""} ${isConcealed ? "timer-hidden" : ""}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
});
