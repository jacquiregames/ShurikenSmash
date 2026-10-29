import { useEffect, useMemo, useReducer, useState } from "react";
import { createMusicPlayer } from "../audio/chiptune";
import {
  BOOM_HOLD_MS,
  COUNTDOWN_GO_MS,
  ENDED_HOLD_MS,
  GAME_MS,
  VIDEO_FALLBACK_MS,
  getOutcomeImageUrl,
  getOutcomeVideoUrl,
} from "../game/config";
import type { Clock, GameMode, NinjaColor, Outcome, PlayerCount } from "../game/types";
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
  const [music] = useState(() => createMusicPlayer());
  const { phase, mode, countdown, startedAt, roundMs, ninjas, numPlayers, knockouts } = state;
  const lastKnockout = knockouts.at(-1);

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

  // Outcome asset preloading. Keyed on "is a match active" (not `phase`) so the
  // downloads are not cancelled and restarted on every phase change.
  const isMatchActive = phase !== "menu";
  useEffect(() => {
    if (!isMatchActive) return;
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
  }, [isMatchActive, ninjas, numPlayers]);

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

  // Countdown Loop
  useEffect(() => {
    if (phase !== "countdown") return;
    clock.set(GAME_MS);
    const id = window.setTimeout(
      () =>
        countdown > 0
          ? dispatch({ type: "countdown_tick" })
          : dispatch({ type: "begin_play", at: performance.now() }),
      countdown > 0 ? 1000 : COUNTDOWN_GO_MS
    );
    return () => window.clearTimeout(id);
  }, [phase, countdown, clock]);

  // Game Play Loop
  useEffect(() => {
    if (phase !== "playing" || startedAt === null) return;
    let raf = 0;
    const tick = (now: number) => {
      const left = Math.min(roundMs, Math.max(0, roundMs - (now - startedAt)));
      clock.set(left);
      if (left === 0) {
        dispatch({ type: "time_up" });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, startedAt, roundMs, clock]);

  // Bakudan music: plays for the whole round and cuts off the instant the round ends.
  useEffect(() => {
    if (phase !== "playing" || mode !== "bakudan") return;
    music.start();
    return () => music.stop();
  }, [phase, mode, music]);

  // Knockout sound effects: explosion when the bomb goes off, a fail buzz on a fumble
  useEffect(() => {
    if (!lastKnockout) return;
    if (lastKnockout.cause === "boom") music.boom();
    else music.fumble();
  }, [lastKnockout, music]);

  // Show the elimination, then move on to the next round (or the finale)
  useEffect(() => {
    if (phase !== "boom") return;
    const id = window.setTimeout(() => dispatch({ type: "next_round" }), BOOM_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

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
