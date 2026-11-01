import { filled, replaceAt } from "../../shared/game/collections";

/** Shuriken Smash: everybody mashes; most strikes in the time wins. */
export interface MashRound {
  counts: number[];
}

export const initialMashRound = (): MashRound => ({ counts: filled(0) });

export const mashStrike = (round: MashRound, seat: number): MashRound => ({
  counts: replaceAt(round.counts, seat, (n) => n + 1),
});

/** What the cards need to show who is ahead. */
export function mashStandings(counts: readonly number[], numPlayers: number) {
  const active = counts.slice(0, numPlayers);
  const topScore = Math.max(...active);
  return {
    topScore,
    /** Never 0, so the power bar can divide by it. */
    maxCount: Math.max(1, topScore),
    leaderCount: active.filter((c) => c === topScore).length,
  };
}
