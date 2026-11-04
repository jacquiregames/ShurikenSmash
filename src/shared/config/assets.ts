import type { BonusTier, NinjaColor, Outcome, PlayerCount } from "../game/types";

/** Asset URLs. Files live in `public/`, so these respect Vite's `base`. */
const base = import.meta.env.BASE_URL;

export const getImageUrl = (name: string, ext = "webp") => `${base}images/${name}.${ext}`;
export const getRewardImageUrl = (count: PlayerCount) => getImageUrl(`reward${count}`);
export const getOutcomeImageUrl = (colorName: NinjaColor, outcome: Outcome) =>
  `${base}images/winlose/${colorName}-${outcome}.webp`;
export const getOutcomeVideoUrl = (colorName: NinjaColor, outcome: Outcome) =>
  `${base}videos/winlose/${colorName}-${outcome}.mp4`;
export const getBonusImageUrl = (name: BonusTier) => `${base}images/${name}.webp`;

/** Blind (Shadow Strike) custom media */
export const getBlindImageUrl = (name: string) => `${base}images/blind/${name}.png`;
export const getBlindVideoUrl = (name: string) => `${base}videos/blind/${name}.mp4`;

/**
 * Rank art by 1-based place. The 4th-place file is still spelled `forth.webp` on disk;
 * to fix the spelling, rename `public/images/forth.webp` and change the last entry here.
 */
const RANK_IMAGES = ["first", "second", "third", "forth"] as const;
const FAIL_IMAGE = "fail";

export const getRankImageUrl = (rank: number | null) =>
  getImageUrl(
    rank !== null && rank >= 1 && rank <= RANK_IMAGES.length ? RANK_IMAGES[rank - 1] : FAIL_IMAGE,
  );