import { blindResults } from "../modes/blind/results";
import { mashResults } from "../modes/mash/results";
import { stackResults } from "../modes/stack/results";
import type { StackPlayer } from "../modes/stack/types";
import { tsugitashiResults } from "../modes/tsugitashi/results";
import type { RoundResults } from "../shared/game/ranking";
import type { GameMode, Ninja } from "../shared/game/types";

export interface RoundInput {
  mode: GameMode;
  players: readonly Ninja[];
  counts: readonly number[];
  strikeTimes: readonly (number | undefined)[];
  /** Shinobi Stack towers, indexed by player id. */
  stacks?: readonly Pick<StackPlayer, "rows" | "status" | "finishedAtMs">[];
  /** Tsugitashi: the target, and the counter value each player let go at. */
  target?: number;
  locked?: readonly (number | undefined)[];
}

/** Scores a finished round by handing it to the mode that played it. */
export function computeResults({
  mode,
  players,
  counts,
  strikeTimes,
  stacks = [],
  target = 0,
  locked = [],
}: RoundInput): RoundResults {
  switch (mode) {
    case "mash":
      return mashResults(players, counts);
    case "blind":
      return blindResults(players, strikeTimes);
    case "stack":
      return stackResults(players, stacks);
    case "tsugitashi":
      return tsugitashiResults(players, target, locked);
    case "kunai":
      return { winnerIds: new Set(), byPlayer: {} }; // Kunai scores itself
  }
}
