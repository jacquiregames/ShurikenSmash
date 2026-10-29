import { useEffect, useMemo, useReducer, useState } from "react";
import {
  ENDED_HOLD_MS,
  GAME_MS,
  VIDEO_FALLBACK_MS,
  getOutcomeImageUrl,
  getOutcomeVideoUrl,
  type Clock,
  type GameMode,
  type NinjaColor,
  type Outcome,
  type PlayerCount,
} from "../game/config";
import { gamepadButtonCode, gamepadTimestamp, newlyPressed } from "../game/gamepad";
import { createInitialState, gameReducer } from "../game/reducer";

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

function isKeyboardFocusedControl(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.matches("button, a, input, select, textarea, [role='button']") &&
    target.matches(":focus-visible")
  );
}

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [clock] = useState(() => createClock(GAME_MS));
  const { phase, countdown, startedAt, ninjas, numPlayers } = state;

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
    }),
    []
  );

  // Outcome asset preloading (runs whenever a match is active)
  useEffect(() => {
    if (phase === "menu") return;
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
  }, [phase, ninjas, numPlayers]);

  // Global Keyboard Handler
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const isConfirm = e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space";
      if (isConfirm && isKeyboardFocusedControl(e.target)) return;
      dispatch({ type: "key_down", code: e.code, at: e.timeStamp });
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Gamepad Poller (arcade buttons on a USB encoder). Gamepads have no events, so poll every
  // frame, but stamp presses with the report's timestamp so frame timing doesn't affect scores.
  useEffect(() => {
    const prev = new Map<number, boolean[]>();
    let raf = 0;
    const poll = () => {
      const now = performance.now();
      for (const gp of navigator.getGamepads?.() ?? []) {
        if (!gp) continue;
        const pressed = gp.buttons.map((b) => b.pressed);
        const at = gamepadTimestamp(gp.timestamp, now);
        for (const index of newlyPressed(prev.get(gp.index) ?? [], pressed)) {
          const code = gamepadButtonCode(index);
          if (code) dispatch({ type: "key_down", code, at });
        }
        prev.set(gp.index, pressed);
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Countdown Loop
  useEffect(() => {
    if (phase !== "countdown") return;
    clock.set(GAME_MS);
    const id = window.setTimeout(
      () =>
        countdown > 1
          ? dispatch({ type: "countdown_tick" })
          : dispatch({ type: "begin_play", at: performance.now() }),
      1000
    );
    return () => window.clearTimeout(id);
  }, [phase, countdown, clock]);

  // Game Play Loop
  useEffect(() => {
    if (phase !== "playing" || startedAt === null) return;
    let raf = 0;
    const tick = (now: number) => {
      const left = Math.min(GAME_MS, Math.max(0, GAME_MS - (now - startedAt)));
      clock.set(left);
      if (left === 0) {
        dispatch({ type: "time_up" });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, startedAt, clock]);

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