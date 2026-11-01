import { Timer } from "../shared/components/Timer";
import type { Clock, Phase, GameMode } from "../shared/game/types";
import { BLIND_THRESHOLD_MS } from "../modes/blind/config";
import { TsugitashiCounter } from "../modes/tsugitashi/TsugitashiCounter";

interface ModeCounterProps {
  mode: GameMode;
  phase: Phase;
  clock: Clock;
  durationMs: number;
  /** Tsugitashi's target number. */
  target: number;
}

const BLIND_CONCEAL = { belowMs: BLIND_THRESHOLD_MS, label: "??.?? (BLIND)" };

/** The big readout above the cards: the shared counter in Tsugitashi, the clock elsewhere. */
export function ModeCounter({ mode, phase, clock, durationMs, target }: ModeCounterProps) {
  if (mode === "tsugitashi") {
    return (
      <TsugitashiCounter phase={phase} clock={clock} target={target} durationMs={durationMs} />
    );
  }
  return (
    <Timer
      phase={phase}
      clock={clock}
      durationMs={durationMs}
      conceal={mode === "blind" ? BLIND_CONCEAL : undefined}
    />
  );
}
