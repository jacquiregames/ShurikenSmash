import { competitionRank, failed, placed, type RoundResults } from "../../shared/game/ranking";
import type { Ninja } from "../../shared/game/types";

export function blindResults(
  players: readonly Ninja[],
  strikeTimes: readonly (number | undefined)[],
): RoundResults {
  const byPlayer: RoundResults["byPlayer"] = {};
  const winnerIds = new Set<number>();
  const entries = players.map((p) => ({ id: p.id, time: strikeTimes[p.id] }));
  const struck = entries.filter((e): e is { id: number; time: number } => e.time !== undefined);

  for (const entry of entries) {
    if (entry.time === undefined) {
      byPlayer[entry.id] = failed("FAIL", "No Strike");
      continue;
    }
    const rank = competitionRank(
      struck,
      { id: entry.id, time: entry.time },
      (a, b) => a.time < b.time,
    );
    byPlayer[entry.id] = placed(rank, `${entry.time.toFixed(3)}s left`, players.length);
    if (rank === 1) winnerIds.add(entry.id);
  }
  return { winnerIds, byPlayer };
}
