import { MAX_PLAYERS } from "../config/players";

/** One slot per seat, all holding `value`. */
export const filled = <T>(value: T): T[] => Array.from({ length: MAX_PLAYERS }, () => value);

/** A copy of `list` with the item at `index` replaced by `update(item)`. */
export function replaceAt<T>(list: readonly T[], index: number, update: (value: T) => T): T[] {
  return list.map((value, i) => (i === index ? update(value) : value));
}
