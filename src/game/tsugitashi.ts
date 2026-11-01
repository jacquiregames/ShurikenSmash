import { TSUGITASHI_STEP_MS } from "./config";

/** The shared counter's value `elapsedMs` into the round: starts at 0 and accelerates. */
export function counterAt(elapsedMs: number): number {
  return Math.floor((Math.max(0, elapsedMs) / TSUGITASHI_STEP_MS) ** 3);
}

/** How long after the start the counter first goes over `target`. */
export function bustMs(target: number): number {
  return TSUGITASHI_STEP_MS * Math.cbrt(target + 1);
}

export const isBust = (value: number, target: number) => value > target;

export const formatNumber = (n: number) => n.toLocaleString("en-US");
