import { getBonusImageUrl, getRankImageUrl } from "./config";
import { STACK_ROWS } from "./stack";
import type { BonusTier, GameMode, Ninja, PlayerResultInfo, StackPlayer } from "./types";

export interface RoundInput {
  mode: GameMode;
  players: readonly Ninja[];
  counts: readonly number[];
  strikeTimes: readonly (number | undefined)[];
  /** Shinobi Stack towers, indexed by player id. */
  stacks?: readonly Pick<StackPlayer, "rows" | "status" | "finishedAtMs">[];
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
  stacks = [],
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

  if (mode === "stack") {
    const entries = players.map((p) => {
      const tower = stacks[p.id];
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
      byPlayer[entry.id] = placed(rank, label, playerCount);
      if (rank === 1) winnerIds.add(entry.id);
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
