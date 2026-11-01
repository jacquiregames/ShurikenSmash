import { getBonusImageUrl, getRankImageUrl } from "../config/assets";
import type { BonusTier, PlayerResultInfo } from "./types";

/** What a mode's results function returns. */
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

/** 1 + how many items beat `item`: ties share a rank. */
export function competitionRank<T>(
  items: readonly T[],
  item: T,
  isBetter: (a: T, b: T) => boolean,
) {
  return 1 + items.filter((other) => isBetter(other, item)).length;
}

/** A player who finished in a ranked place. */
export function placed(rank: number, scoreLabel: string, playerCount: number): PlayerResultInfo {
  const info = getRankInfo(rank, playerCount);
  return {
    rank,
    rankLabel: info.label,
    rankImage: info.rankImage,
    bonusImage: info.bonusImage,
    scoreLabel,
  };
}

/** A player who did not place (or nobody scored). */
export function failed(rankLabel: string, scoreLabel: string): PlayerResultInfo {
  return { rank: null, rankLabel, rankImage: getRankImageUrl(null), scoreLabel };
}
