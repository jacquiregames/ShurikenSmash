import { replaceAt } from "./collections";
import { unit } from "./random";

/** A slash + "+1" popup on a player's shuriken. */
export interface Hit {
  id: number;
  x: number;
  y: number;
  rot: number;
}

export const MAX_VISIBLE_HITS = 8;

/** The bits of visual feedback state every mode shares: per-seat pulses, hit popups, an id counter. */
export interface Effects {
  /** Increments each time a seat does something; replays that seat's animation. */
  pulses: number[];
  hits: Hit[][];
  /** Source of unique ids for hits (and, in Shinobi Stack, bursts). */
  seq: number;
}

function createHit(seq: number): Hit {
  return {
    id: seq,
    x: 15 + unit(seq * 3 + 1) * 70,
    y: 20 + unit(seq * 3 + 2) * 50,
    rot: unit(seq * 3 + 3) * 360,
  };
}

export const bumpPulse = <T extends Pick<Effects, "pulses">>(state: T, seat: number): T => ({
  ...state,
  pulses: replaceAt(state.pulses, seat, (n) => n + 1),
});

/** Adds a hit popup (and a pulse) for `seat`. */
export function addHit<T extends Effects>(state: T, seat: number): T {
  const seq = state.seq + 1;
  return {
    ...bumpPulse(state, seat),
    seq,
    hits: replaceAt(state.hits, seat, (list) => [
      ...list.slice(-(MAX_VISIBLE_HITS - 1)),
      createHit(seq),
    ]),
  };
}

export const removeHit = <T extends Pick<Effects, "hits">>(
  state: T,
  seat: number,
  hitId: number,
): T =>
  state.hits[seat]?.some((h) => h.id === hitId)
    ? { ...state, hits: replaceAt(state.hits, seat, (l) => l.filter((h) => h.id !== hitId)) }
    : state;
