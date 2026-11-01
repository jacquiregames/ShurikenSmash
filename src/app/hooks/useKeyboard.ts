import { useEffect, type Dispatch } from "react";
import { toggleMuted, unlockAudio } from "../../shared/audio/context";
import type { GameAction } from "../reducer";

/** True when the event target is a control that Enter/Space would activate. */
function isActivatableControl(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.matches("button, a, input, select, textarea, [role='button']")
  );
}

/**
 * Global keyboard handler. Enter/Space start the game unless the user is Tab-navigating,
 * in which case they activate the focused button. (A mouse click also focuses a button,
 * so :focus-visible alone can't tell the two apart.) M mutes in every mode.
 */
export function useKeyboard(dispatch: Dispatch<GameAction>) {
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
      unlockAudio();
      if (e.code === "KeyM") {
        toggleMuted();
        return;
      }
      dispatch({ type: "key_down", code: e.code, at: e.timeStamp });
    };
    const onKeyUp = (e: KeyboardEvent) =>
      dispatch({ type: "key_up", code: e.code, at: e.timeStamp });
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [dispatch]);
}
