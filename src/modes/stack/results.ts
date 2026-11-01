import { competitionRank, failed, placed, type RoundResults } from "../../shared/game/ranking";
import type { Ninja } from "../../shared/game/types";
import { STACK_ROWS } from "./stack";
import type { StackPlayer } from "./types";

export function stackResults(
  players: readonly Ninja[],
  towers: readonly Pick<StackPlayer, "rows" | "status" | "finishedAtMs">[],
): RoundResults {
  const byPlayer: RoundResults["byPlayer"] = {};
  const winnerIds = new Set<number>();
  const entries = players.map((p) => {
    const tower = towers[p.id];
    return {
      id: p.id,
      height: tower?.rows.length ?? 0,
      summit: tower?.status === "summit",
      timeMs: tower?.finishedAtMs ?? 0,
    };
  });
  const noContest = entries.every((e) => e.height === 0);
  // Summiting beats not summiting; summiters rank by speed, the rest by height.
  const isBetter = (a: (typeof entries)[number], b: (typeof entries)[number]) => {
    if (a.summit !== b.summit) return a.summit;
    return a.summit ? a.timeMs < b.timeMs : a.height > b.height;
  };

  for (const entry of entries) {
    const label = entry.summit
      ? `Summit in ${(entry.timeMs / 1000).toFixed(2)}s`
      : `Height ${entry.height}/${STACK_ROWS}`;
    if (noContest) {
      byPlayer[entry.id] = failed("NO BLOCKS", label);
      continue;
    }
    const rank = competitionRank(entries, entry, isBetter);
    byPlayer[entry.id] = placed(rank, label, players.length);
    if (rank === 1) winnerIds.add(entry.id);
  }
  return { winnerIds, byPlayer };
}
