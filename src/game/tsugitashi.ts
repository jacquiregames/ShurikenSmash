import { TSUGITASHI_GROWTH_MS } from "./config";

/**
 * How much a single press adds after being held for `heldMs`: a tap adds 1, and the
 * amount grows exponentially the longer it is held (~1.2 million after 7 seconds).
 */
export function holdAmount(heldMs: number): number {
  return Math.floor(Math.exp(Math.max(0, heldMs) / TSUGITASHI_GROWTH_MS));
}

export const isBust = (value: number, target: number) => value > target;

export const formatNumber = (n: number) => n.toLocaleString("en-US");
