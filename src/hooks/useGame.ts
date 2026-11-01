import { useEffect, useMemo, useReducer, useRef, useState } from "react";
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
import { createInitialState, gameReducer, nextStackDue, roundDuration } from "../game/reducer";
import { isBust } from "../game/tsugitashi";
import { bomb, startRiser, stopRiser, unlockAudio } from "../audio/tsugitashi";

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
  const duration = roundDuration(state);
  const isTsugitashi = mode === "tsugitashi";
  // Tsugitashi's countdown waits until every ninja is holding their button.
  const armed = !isTsugitashi || state.held.slice(0, numPlayers).every(Boolean);
  const bustCount = isTsugitashi
    ? state.locked.slice(0, numPlayers).filter((v) => v !== undefined && isBust(v, state.target)).length
    : 0;
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

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
      // Safari only lets audio start from inside a user gesture.
      if (modeRef.current === "tsugitashi") unlockAudio();
      dispatch({ type: "key_down", code: e.code, at: e.timeStamp });
    };
    const onKeyUp = (e: KeyboardEvent) => dispatch({ type: "key_up", code: e.code, at: e.timeStamp });
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Countdown Loop
  useEffect(() => {
    if (phase !== "countdown") return;
    clock.set(ROUND_MS[mode]);
    if (!armed) return;
    const id = window.setTimeout(
      () =>
        countdown > 0
          ? dispatch({ type: "countdown_tick" })
          : dispatch({ type: "begin_play", at: performance.now(), random: Math.random() }),
      countdown > 0 ? 1000 : COUNTDOWN_GO_MS
    );
    return () => window.clearTimeout(id);
  }, [phase, mode, countdown, armed, clock]);

  // Game Play Loop
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
  }, [phase, duration, startedAt, clock]);

  // Tsugitashi: one tone rises with the shared counter while it runs
  useEffect(() => {
    if (phase !== "playing" || !isTsugitashi) return;
    startRiser();
    return stopRiser;
  }, [phase, isTsugitashi]);

  // Tsugitashi: a bomb goes off whenever someone busts
  useEffect(() => {
    if (bustCount > 0) bomb();
  }, [bustCount]);

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
