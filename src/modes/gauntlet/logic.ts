import { BONUS_POINTS, bonusTierFor } from "../../shared/game/ranking";
import type { GameMode } from "../../shared/game/types";

/** Ninja Gauntlet: every other game, back to back, scored by the bonus tier each one pays. */
export const GAUNTLET_GAMES: readonly GameMode[] = [
  "mash",
  "blind",
  "tsugitashi",
  "stack",
  "kunai",
];

/** The "next game starts in" countdown runs from this down to 1. */
export const GAUNTLET_COUNTDOWN = 5;

export interface GauntletRun {
  games: readonly GameMode[];
  /** The game being played (or just finished). */
  index: number;
  /** Where each seat finished in each completed game (`null`: did not place); one row per game. */
  ranks: (readonly (number | null)[])[];
  /** Seconds left before the next game (or the standings); `null` while a game is being played. */
  nextIn: number | null;
}

export const initialGauntlet = (): GauntletRun => ({
  games: GAUNTLET_GAMES,
  index: 0,
  ranks: [],
  nextIn: null,
});

export const isLastGame = (run: GauntletRun) => run.index >= run.games.length - 1;

/** Files away how the current game finished and starts the countdown to what comes next. */
export function recordGame(run: GauntletRun, ranks: readonly (number | null)[]): GauntletRun {
  if (run.ranks.length > run.index) return run; // already recorded
  return { ...run, ranks: [...run.ranks, ranks], nextIn: GAUNTLET_COUNTDOWN };
}

/** Each seat's gauntlet score: the sum of the bonus every finishing place paid. */
export function gauntletTotals(run: Pick<GauntletRun, "ranks">, numPlayers: number): number[] {
  return Array.from({ length: numPlayers }, (_, seat) =>
    run.ranks.reduce(
      (sum, game) => sum + BONUS_POINTS[bonusTierFor(game[seat] ?? null, numPlayers)],
      0,
    ),
  );
}
