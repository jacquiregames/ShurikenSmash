import type { Effects } from "../shared/game/effects";
import type { GameMode, Ninja, Phase, PlayerCount } from "../shared/game/types";
import { type BlindRound } from "../modes/blind/logic";
import { type MashRound } from "../modes/mash/logic";
import { type StackRound } from "../modes/stack/logic";
import { type TsugiRound } from "../modes/tsugitashi/logic";

/**
 * Everything the game knows. The top-level fields are the flow every mode shares; each
 * timed mode keeps its own round state in its own slice, owned by that mode's `logic.ts`.
 */
export interface GameState extends Effects {
  phase: Phase;
  mode: GameMode;
  numPlayers: PlayerCount;
  ninjas: Ninja[];
  countdown: number;
  startedAt: number | null;
  videosDone: boolean[];
  resultsShownAt: number;
  mash: MashRound;
  blind: BlindRound;
  stack: StackRound;
  tsugitashi: TsugiRound;
}
