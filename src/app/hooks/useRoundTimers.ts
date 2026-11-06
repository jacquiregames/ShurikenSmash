import { useEffect, type Dispatch } from "react";
import { ENDED_HOLD_MS, VIDEO_FALLBACK_MS } from "../../shared/config/timing";
import type { Clock } from "../../shared/game/types";
import { BLIND_VIDEO_FALLBACK_MS } from "../../modes/blind/config";
import { roundMsFor } from "../../modes/registry";
import { everyoneHolding } from "../../modes/tsugitashi/logic";
import { roundDuration, type GameAction } from "../reducer";
import type { GameState } from "../state";

/** The timers that move a round through countdown → play → video → results (and on to the next gauntlet game). */
export function useRoundTimers(state: GameState, dispatch: Dispatch<GameAction>, clock: Clock) {
  const { phase, mode, countdown, startedAt, numPlayers } = state;
  const duration = roundDuration(state);
  // Tsugitashi's countdown waits until every ninja is holding their button.
  const armed = mode !== "tsugitashi" || everyoneHolding(state.tsugitashi, numPlayers);

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    clock.set(roundMsFor(mode));
    if (!armed) return;
    const id = window.setTimeout(
      () =>
        countdown > 0
          ? dispatch({ type: "countdown_tick" })
          : dispatch({ type: "begin_play", at: performance.now(), random: Math.random() }),
      countdown > 0 ? 1000 : 0, // the round starts the moment the 1 ends
    );
    return () => window.clearTimeout(id);
  }, [phase, mode, countdown, armed, clock, dispatch]);

  // Play: drive the clock every frame until time runs out
  useEffect(() => {
    if (phase !== "playing" || startedAt === null) return;
    let raf = 0;
    const tick = (now: number) => {
      const left = Math.min(duration, Math.max(0, duration - (now - startedAt)));
      clock.set(left);
      if (left === 0) {
        dispatch({ type: "time_up" });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, duration, startedAt, clock, dispatch]);

  // Play starts on the first frame that is actually on screen, so a slow first render
  // never eats into the round (or makes the clock jump).
  const awaitingPaint = phase === "playing" && startedAt !== null && !state.playSynced;
  useEffect(() => {
    if (!awaitingPaint) return;
    let inner = 0;
    // The first callback runs before the frame is drawn, the second after it.
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() =>
        dispatch({ type: "play_painted", at: performance.now() }),
      );
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [awaitingPaint, dispatch]);

  // Video fallback safety timer (6s for blind mode videos, 12s elsewhere)
  useEffect(() => {
    if (phase !== "video") return;
    const fallbackMs = mode === "blind" ? BLIND_VIDEO_FALLBACK_MS : VIDEO_FALLBACK_MS;
    const id = window.setTimeout(() => dispatch({ type: "video_timeout" }), fallbackMs);
    return () => window.clearTimeout(id);
  }, [phase, mode, dispatch]);

  // Ninja Gauntlet: count down the seconds between one game and the next
  const nextIn = state.gauntlet?.nextIn ?? null;
  useEffect(() => {
    if (nextIn === null) return;
    const id = window.setTimeout(
      () => dispatch({ type: "gauntlet_tick", at: performance.now() }),
      1000,
    );
    return () => window.clearTimeout(id);
  }, [nextIn, dispatch]);

  // Post-round hold before showing results
  useEffect(() => {
    if (phase !== "ended") return;
    const id = window.setTimeout(
      () => dispatch({ type: "show_results", at: performance.now() }),
      ENDED_HOLD_MS,
    );
    return () => window.clearTimeout(id);
  }, [phase, dispatch]);
}
