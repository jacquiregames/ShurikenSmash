import { competitionRank, failed, placed, type RoundResults } from "../../shared/game/ranking";
import type { Ninja } from "../../shared/game/types";
import { formatNumber, isBust } from "./tsugitashi";

/** Closest without going over wins; going over is a bust. */
export function tsugitashiResults(
  players: readonly Ninja[],
  target: number,
  locked: readonly (number | undefined)[],
): RoundResults {
  const byPlayer: RoundResults["byPlayer"] = {};
  const winnerIds = new Set<number>();
  const entries = players.map((p) => ({ id: p.id, value: locked[p.id] ?? target + 1 }));
  const valid = entries.filter((e) => !isBust(e.value, target));

  for (const entry of entries) {
    const { value } = entry;
    if (isBust(value, target)) {
      byPlayer[entry.id] = failed("BUST", "BUST!");
      continue;
    }
    const label =
      value === target ? `EXACT! ${formatNumber(value)}` : `${formatNumber(target - value)} short`;
    const rank = competitionRank(valid, entry, (a, b) => a.value > b.value);
    byPlayer[entry.id] = placed(rank, label, players.length);
    if (rank === 1) winnerIds.add(entry.id);
  }
  return { winnerIds, byPlayer };
}
