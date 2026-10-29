import { GAMEPAD_BUTTON_PLAYERS } from "./config";
import { DEFAULT_NINJAS } from "./ninjas";

/** Indices of buttons that went from released to pressed since the previous poll. */
export function newlyPressed(prev: readonly boolean[], next: readonly boolean[]): number[] {
  const indices: number[] = [];
  next.forEach((pressed, i) => {
    if (pressed && !prev[i]) indices.push(i);
  });
  return indices;
}

/** Indices of buttons that went from pressed to released since the previous poll. */
export function newlyReleased(prev: readonly boolean[], next: readonly boolean[]): number[] {
  const indices: number[] = [];
  prev.forEach((pressed, i) => {
    if (pressed && !next[i]) indices.push(i);
  });
  return indices;
}

/** The player key code a gamepad button stands in for, so presses flow through the keyboard path. */
export function gamepadButtonCode(index: number): string | undefined {
  const playerId = GAMEPAD_BUTTON_PLAYERS[index];
  return playerId === undefined ? undefined : DEFAULT_NINJAS.find((n) => n.id === playerId)?.code;
}

/**
 * When the browser received the gamepad's input report, on the `performance.now()` clock.
 * Falls back to `now` if the browser reports no usable timestamp.
 */
export function gamepadTimestamp(timestamp: number, now: number): number {
  return timestamp > 0 && timestamp <= now ? timestamp : now;
}
