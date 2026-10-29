import { getBonusImageUrl, getRankImageUrl } from "./config";
import type { BonusTier, GameMode, Knockout, Ninja, PlayerResultInfo } from "./types";

export interface RoundInput {
  mode: GameMode;
  players: readonly Ninja[];
  counts: readonly number[];
  strikeTimes: readonly (number | undefined)[];
  /** Bakudan elimination order; everyone not listed is still standing. */
  knockouts?: readonly Knockout[];
}

export interface RoundResults {
  winnerIds: ReadonlySet<number>;
  byPlayer: Record<number, PlayerResultInfo>;
}

const SUFFIXES = ["ST", "ND", "RD"] as const;
const BONUS_TIERS_4: readonly BonusTier[] = ["plus100", "plus50", "plus10", "plus0"];
const BONUS_TIERS_3: readonly BonusTier[] = ["plus100", "plus50", "plus0"];

export function getRankInfo(rank: number, playerCount = 4) {
  const bonusTiers = playerCount === 3 ? BONUS_TIERS_3 : BONUS_TIERS_4;
  const bonusTier = bonusTiers[rank - 1];
  return {
    label: `${rank}${SUFFIXES[rank - 1] ?? "TH"} PLACE`,
    rankImage: getRankImageUrl(rank),
    bonusImage: bonusTier ? getBonusImageUrl(bonusTier) : undefined,
  };
}

function competitionRank<T>(items: readonly T[], item: T, isBetter: (a: T, b: T) => boolean) {
  return 1 + items.filter((other) => isBetter(other, item)).length;
}

function placed(rank: number, scoreLabel: string, playerCount: number): PlayerResultInfo {
  const info = getRankInfo(rank, playerCount);
  return {
    rank,
    rankLabel: info.label,
    rankImage: info.rankImage,
    bonusImage: info.bonusImage,
    scoreLabel,
  };
}

function failed(rankLabel: string, scoreLabel: string): PlayerResultInfo {
  return { rank: null, rankLabel, rankImage: getRankImageUrl(null), scoreLabel };
}

export function computeResults({
  mode,
  players,
  counts,
  strikeTimes,
  knockouts = [],
}: RoundInput): RoundResults {
  const byPlayer: Record<number, PlayerResultInfo> = {};
  const winnerIds = new Set<number>();
  const playerCount = players.length;

  if (mode === "mash") {
    const entries = players.map((p) => ({ id: p.id, score: counts[p.id] ?? 0 }));
    const noContest = entries.every((e) => e.score === 0);

    for (const entry of entries) {
      const label = `${entry.score} ${entry.score === 1 ? "Strike" : "Strikes"}`;
      if (noContest) {
        byPlayer[entry.id] = failed("NO STRIKES", label);
        continue;
      }
      const rank = competitionRank(entries, entry, (a, b) => a.score > b.score);
      byPlayer[entry.id] = placed(rank, label, playerCount);
      if (rank === 1) winnerIds.add(entry.id);
    }
    return { winnerIds, byPlayer };
  }

  if (mode === "bakudan") {
    // Later eliminations place higher; survivors share 1st.
    for (const p of players) {
      const index = knockouts.findIndex((k) => k.playerId === p.id);
      if (index === -1) {
        byPlayer[p.id] = placed(1, "Last Ninja Standing", playerCount);
        winnerIds.add(p.id);
        continue;
      }
      const { cause, round } = knockouts[index];
      const label = `${cause === "boom" ? "Blown Up" : "Fumbled"} · Round ${round}`;
      byPlayer[p.id] = placed(playerCount - index, label, playerCount);
    }
    return { winnerIds, byPlayer };
  }

  const entries = players.map((p) => ({ id: p.id, time: strikeTimes[p.id] }));
  const struck = entries.filter((e): e is { id: number; time: number } => e.time !== undefined);

  for (const entry of entries) {
    if (entry.time === undefined) {
      byPlayer[entry.id] = failed("FAIL", "No Strike");
      continue;
    }
    const rank = competitionRank(struck, { id: entry.id, time: entry.time }, (a, b) => a.time < b.time);
    byPlayer[entry.id] = placed(rank, `${entry.time.toFixed(3)}s left`, playerCount);
    if (rank === 1) winnerIds.add(entry.id);
  }
  return { winnerIds, byPlayer };
}
