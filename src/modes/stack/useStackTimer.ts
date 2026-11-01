import { useEffect } from "react";

/**
 * Wakes up exactly when the next stack block is due to move.
 *
 * This only re-runs when `due` changes, and `due` only changes when a block actually
 * moves. Timers can fire a hair early relative to performance.now(); if we reported that
 * earlier time, the reducer would see "not due yet", return the same state, React would
 * bail out, and nothing would ever re-arm this timer, freezing the blocks. Clamping `at`
 * to at least `due` guarantees the reducer makes progress, which changes `due` and
 * re-arms the timer. `onTick` must be stable.
 */
export function useStackTimer(due: number | null, onTick: (at: number) => void) {
  useEffect(() => {
    if (due === null) return;
    const id = window.setTimeout(
      () => onTick(Math.max(performance.now(), due)),
      Math.max(0, due - performance.now()),
    );
    return () => window.clearTimeout(id);
  }, [due, onTick]);
}
