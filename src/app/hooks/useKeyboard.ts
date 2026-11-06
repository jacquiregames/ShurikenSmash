import { useEffect, useRef, type Dispatch } from "react";
import { toggleMuted, unlockAudio } from "../../shared/audio/context";
import { startMusic } from "../../shared/audio/music";
import { isActivatableControl } from "../../shared/dom";
import type { Phase } from "../../shared/game/types";
import type { GameAction } from "../reducer";

/**
 * Global keyboard handler. Enter/Space start the game unless the user is Tab-navigating,
 * in which case they activate the focused button. (A mouse click also focuses a button,
 * so :focus-visible alone can't tell the two apart.) M mutes in every mode. Switching away
 * from the window releases every held button, since the key-up would never arrive.
 *
 * Kunai Bullseye reads its own keys, so while it runs only Escape is passed on.
 */
export function useKeyboard(dispatch: Dispatch<GameAction>, phase: Phase) {
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const nav = { tabbing: false };
    const onPointerDown = () => {
      nav.tabbing = false;
      startMusic(); // browsers only start audio from a gesture
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Tab") nav.tabbing = true;
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const isConfirm = e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space";
      if (isConfirm && nav.tabbing && isActivatableControl(e.target)) return;
      // Safari only lets audio start from inside a user gesture.
      unlockAudio();
      startMusic();
      if (e.code === "KeyM") {
        toggleMuted();
        return;
      }
      if (phaseRef.current === "kunai" && e.code !== "Escape") return;
      dispatch({ type: "key_down", code: e.code, at: e.timeStamp });
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (phaseRef.current === "kunai") return;
      dispatch({ type: "key_up", code: e.code, at: e.timeStamp });
    };
    const releaseAll = () => dispatch({ type: "release_all", at: performance.now() });
    const onVisibility = () => {
      if (document.hidden) releaseAll();
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", releaseAll);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", releaseAll);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [dispatch]);
}
