import { memo, useSyncExternalStore } from "react";
import { GAME_MS, BLIND_THRESHOLD_MS } from "../game/config";
import type { Phase, GameMode, Clock } from "../game/types";

interface TimerProps {
  phase: Phase;
  mode: GameMode;
  clock: Clock;
  /** Bakudan round number; the fuse length itself is never shown. */
  round: number;
}

const formatSeconds = (ms: number) => (ms / 1000).toFixed(2);

export const Timer = memo(function Timer({ phase, mode, clock, round }: TimerProps) {
  const timeLeft = useSyncExternalStore(clock.subscribe, clock.getSnapshot);

  if (mode === "bakudan") {
    return (
      <div className="timer-wrap">
        <div className="timer-text">ROUND {round}</div>
        <div className="timer-bar">
          <div className={`timer-fill fuse ${phase === "playing" ? "fuse-lit" : ""}`} />
        </div>
      </div>
    );
  }

  const isPlaying = phase === "playing";
  const isBlindHidden = mode === "blind" && isPlaying && timeLeft <= BLIND_THRESHOLD_MS;
  const isPostRound = phase === "video" || phase === "ended" || phase === "results";
  const showLive = isPlaying || isPostRound;

  const displayTime = isBlindHidden
    ? "??.?? (BLIND)"
    : formatSeconds(showLive ? timeLeft : GAME_MS);
  const widthPct = isBlindHidden ? 0 : showLive ? (timeLeft / GAME_MS) * 100 : 100;
  const isDanger = !isBlindHidden && timeLeft < 3000;

  return (
    <div className="timer-wrap">
      <div className={`timer-text ${isBlindHidden ? "blind-hidden" : ""}`}>{displayTime}</div>
      <div className="timer-bar">
        <div
          className={`timer-fill ${isDanger ? "danger" : ""} ${isBlindHidden ? "timer-hidden" : ""}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </div>
  );
});
