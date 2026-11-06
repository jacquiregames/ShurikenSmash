/** Timings shared by every timed mode. Per-mode timings live in that mode's folder. */

export const COUNTDOWN_START = 3;
/** Safety net: the round moves on even if a video never fires `ended`. */
export const VIDEO_FALLBACK_MS = 12_000;
/** How long the static win/lose art is shown before the results appear. */
export const ENDED_HOLD_MS = 2000;
/** Ignore keyboard "confirm" presses right after results appear (mashing guard). */
export const RESULTS_INPUT_LOCK_MS = 1_000;

/** A second Escape within this long of the first leaves a match in progress. */
export const ESCAPE_CONFIRM_MS = 1500;
