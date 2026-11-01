import { useEffect, useMemo, useReducer, useState } from "react";
import {
  COUNTDOWN_GO_MS,
  ENDED_HOLD_MS,
  ROUND_MS,
  VIDEO_FALLBACK_MS,
  getOutcomeImageUrl,
  getOutcomeVideoUrl,
  usesOutcomeMedia,
} from "../game/config";
import type { Clock, GameMode, NinjaColor, Outcome, PlayerCount } from "../game/types";
import { createInitialState, gameReducer, nextStackDue } from "../game/reducer";

function createClock(initial: number): Clock {
  let value = initial;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => value,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (next) => {
      if (next === value) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
  };
}

/** True when the event target is a control that Enter/Space would activate. */
function isActivatableControl(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.matches("button, a, input, select, textarea, [role='button']")
  );
}

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [clock] = useState(() => createClock(ROUND_MS.mash));
  const { phase, mode, countdown, startedAt, ninjas, numPlayers } = state;
  const stackDue = nextStackDue(state);

  const actions = useMemo(
    () => ({
      selectMode: (mode: GameMode) => dispatch({ type: "select_mode", mode }),
      selectPlayerCount: (count: PlayerCount) => dispatch({ type: "select_player_count", count }),
      selectColor: (playerId: number, color: NinjaColor) =>
        dispatch({ type: "select_color", playerId, color }),
      start: () => dispatch({ type: "start" }),
      returnToMenu: () => dispatch({ type: "return_to_menu" }),
      videoEnded: (playerId: number) => dispatch({ type: "video_ended", playerId }),
      hitDone: (playerId: number, hitId: number) =>
        dispatch({ type: "hit_done", playerId, hitId }),
      burstDone: (playerId: number, burstId: number) =>
        dispatch({ type: "burst_done", playerId, burstId }),
    }),
    []
  );

  // Outcome asset preloading. Keyed on "is a match active" (not `phase`) so the
  // downloads are not cancelled and restarted on every phase change.
  const isMatchActive = phase !== "menu";
  useEffect(() => {
    // Only Shuriken Smash and Shadow Strike use the win/lose media.
    if (!isMatchActive || !usesOutcomeMedia(mode)) return;
    const activeNinjas = ninjas.slice(0, numPlayers);
    const OUTCOMES: readonly Outcome[] = ["win", "lose"];
    const videos: HTMLVideoElement[] = [];

    for (const { colorName } of activeNinjas) {
      for (const outcome of OUTCOMES) {
        new Image().src = getOutcomeImageUrl(colorName, outcome);

        const video = document.createElement("video");
        video.preload = "auto";
        video.muted = true;
        video.src = getOutcomeVideoUrl(colorName, outcome);
        videos.push(video);
      }
    }

    return () => {
      for (const video of videos) {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [isMatchActive, mode, ninjas, numPlayers]);

  // Global keyboard handler. Enter/Space start the game unless the user is
  // Tab-navigating, in which case they activate the focused button. (A mouse
  // click also focuses a button, so :focus-visible alone can't tell the two apart.)
  useEffect(() => {
    let tabNavigating = false;
    const onPointerDown = () => {
      tabNavigating = false;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Tab") tabNavigating = true;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const isConfirm = e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space";
      if (isConfirm && tabNavigating && isActivatableControl(e.target)) return;
      dispatch({ type: "key_down", code: e.code, at: e.timeStamp });
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // Countdown Loop
  useEffect(() => {
    if (phase !== "countdown") return;
    clock.set(ROUND_MS[mode]);
    const id = window.setTimeout(
      () =>
        countdown > 0
          ? dispatch({ type: "countdown_tick" })
          : dispatch({ type: "begin_play", at: performance.now() }),
      countdown > 0 ? 1000 : COUNTDOWN_GO_MS
    );
    return () => window.clearTimeout(id);
  }, [phase, mode, countdown, clock]);

  // Game Play Loop
  useEffect(() => {
    if (phase !== "playing" || startedAt === null) return;
    const duration = ROUND_MS[mode];
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
  }, [phase, mode, startedAt, clock]);

  // Shinobi Stack: wake up exactly when the next block is due to move.
  //
  // This effect only re-runs when `stackDue` changes, and `stackDue` only changes
  // when a block actually moves. Timers can fire a hair early relative to
  // performance.now(); if we reported that earlier time, the reducer would see
  // "not due yet", return the same state, React would bail out, and nothing would
  // ever re-arm this timer, freezing the blocks. Clamping `at` to at least
  // `stackDue` guarantees the reducer makes progress, which changes `stackDue`
  // and re-arms the timer.
  useEffect(() => {
    if (stackDue === null) return;
    const id = window.setTimeout(
      () => dispatch({ type: "stack_tick", at: Math.max(performance.now(), stackDue) }),
      Math.max(0, stackDue - performance.now())
    );
    return () => window.clearTimeout(id);
  }, [stackDue]);

  // Video fallback safety timer
  useEffect(() => {
    if (phase !== "video") return;
    const id = window.setTimeout(() => dispatch({ type: "video_timeout" }), VIDEO_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  // Post-round hold before showing results
  useEffect(() => {
    if (phase !== "ended") return;
    const id = window.setTimeout(
      () => dispatch({ type: "show_results", at: performance.now() }),
      ENDED_HOLD_MS
    );
    return () => window.clearTimeout(id);
  }, [phase]);

  return { state, clock, actions };
}
