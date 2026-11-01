import { filled, replaceAt } from "../../shared/game/collections";
import { BLIND_ROUND_MS } from "./config";

/** Shadow Strike: one strike each; closest to the buzzer (with the clock hidden) wins. */
export interface BlindRound {
  /** Seconds left when each seat struck; `undefined` until they do. */
  strikeTimes: (number | undefined)[];
}

export const initialBlindRound = (): BlindRound => ({
  strikeTimes: filled<number | undefined>(undefined),
});

export const hasStruck = (round: BlindRound, seat: number) => round.strikeTimes[seat] !== undefined;

export const blindStrike = (round: BlindRound, seat: number, elapsedMs: number): BlindRound => ({
  strikeTimes: replaceAt(round.strikeTimes, seat, () => (BLIND_ROUND_MS - elapsedMs) / 1000),
});

export const everyoneStruck = (round: BlindRound, numPlayers: number) =>
  round.strikeTimes.slice(0, numPlayers).every((t) => t !== undefined);
