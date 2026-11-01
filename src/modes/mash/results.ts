import { competitionRank, failed, placed, type RoundResults } from "../../shared/game/ranking";
import type { Ninja } from "../../shared/game/types";

export function mashResults(players: readonly Ninja[], counts: readonly number[]): RoundResults {
  const byPlayer: RoundResults["byPlayer"] = {};
  const winnerIds = new Set<number>();
  const entries = players.map((p) => ({ id: p.id, score: counts[p.id] ?? 0 }));
  const noContest = entries.every((e) => e.score === 0);

  for (const entry of entries) {
    const label = `${entry.score} ${entry.score === 1 ? "Strike" : "Strikes"}`;
    if (noContest) {
      byPlayer[entry.id] = failed("NO STRIKES", label);
      continue;
    }
    const rank = competitionRank(entries, entry, (a, b) => a.score > b.score);
    byPlayer[entry.id] = placed(rank, label, players.length);
    if (rank === 1) winnerIds.add(entry.id);
  }
  return { winnerIds, byPlayer };
}
