import { useEffect } from "react";
import type { Phase } from "../../shared/game/types";
import { bomb, startRiser, stopRiser } from "./audio";

/** One tone rises with the shared counter while it runs, and a bomb goes off for each new bust. */
export function useTsugitashiAudio(active: boolean, phase: Phase, bustCount: number) {
  useEffect(() => {
    if (phase !== "playing" || !active) return;
    startRiser();
    return stopRiser;
  }, [phase, active]);

  useEffect(() => {
    if (bustCount > 0) bomb();
  }, [bustCount]);
}
