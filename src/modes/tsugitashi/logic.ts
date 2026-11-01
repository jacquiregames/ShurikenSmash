import { filled, replaceAt } from "../../shared/game/collections";
import { TSUGITASHI_MAX_TARGET, TSUGITASHI_MIN_TARGET } from "./config";
import { bustMs, counterAt, isBust } from "./tsugitashi";

/** Tsugitashi: hold to start, let go to lock in the shared counter, never pass the target. */
export interface TsugiRound {
  /** The number to get closest to without going over. */
  target: number;
  /** Whose button is currently held down. */
  held: boolean[];
  /** The counter value each seat let go at (over `target` is a bust). */
  locked: (number | undefined)[];
}

export const initialTsugiRound = (): TsugiRound => ({
  target: 0,
  held: filled(false),
  locked: filled<number | undefined>(undefined),
});

/** `random` in [0, 1) picks the target; it arrives with the action to keep the reducer pure. */
export const drawTarget = (round: TsugiRound, random: number): TsugiRound => {
  const span = TSUGITASHI_MAX_TARGET - TSUGITASHI_MIN_TARGET + 1;
  return { ...round, target: TSUGITASHI_MIN_TARGET + Math.floor(random * span) };
};

export const everyoneHolding = (round: TsugiRound, numPlayers: number) =>
  round.held.slice(0, numPlayers).every(Boolean);

export const everyoneLocked = (round: TsugiRound, numPlayers: number) =>
  round.locked.slice(0, numPlayers).every((v) => v !== undefined);

/** How many seats have locked in a number over the target. */
export const countBusts = (round: TsugiRound, numPlayers: number) =>
  round.locked.slice(0, numPlayers).filter((v) => v !== undefined && isBust(v, round.target))
    .length;

/** Press or release a seat's button. Returns the same round if nothing changes. */
export const setHeld = (round: TsugiRound, seat: number, down: boolean): TsugiRound =>
  round.held[seat] === down ? round : { ...round, held: replaceAt(round.held, seat, () => down) };

/** A seat lets go and locks in whatever the counter shows. Same round if they weren't holding. */
export function lockIn(round: TsugiRound, seat: number, elapsedMs: number): TsugiRound {
  if (!round.held[seat]) return round;
  return {
    ...round,
    held: replaceAt(round.held, seat, () => false),
    locked: replaceAt(round.locked, seat, () => counterAt(elapsedMs)),
  };
}

/** The counter passed the target, so anyone still holding busts. */
export function bustHolders(round: TsugiRound): TsugiRound {
  const over = Math.max(round.target + 1, counterAt(bustMs(round.target)));
  return {
    ...round,
    locked: round.locked.map((v, i) => (round.held[i] && v === undefined ? over : v)),
    held: filled(false),
  };
}
