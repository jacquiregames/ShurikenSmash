/** Safety cap only: a round ends when the counter passes the target. */
export const TSUGITASHI_ROUND_MS = 15_000;
/** The range the random target is drawn from. */
export const TSUGITASHI_MIN_TARGET = 100_000;
export const TSUGITASHI_MAX_TARGET = 999_999;
/**
 * The shared counter reads (elapsedMs / this)^3, so it accelerates and
 * reaches the target range after roughly 4.5-10 seconds. Lower it to speed things up.
 */
export const TSUGITASHI_STEP_MS = 100;
