import type { BonusTier, GameMode, NinjaColor, Outcome, PlayerCount } from "../game/types";

/**
 * Every asset URL in the app. Nothing else builds a path into `public/`, so reorganising the
 * folders only ever means editing this file. Files live in `public/`, so these respect Vite's
 * `base`.
 *
 *   public/
 *   ├── music.mp3
 *   ├── images/
 *   │   ├── ui/          background, begin, continue, players-3/4, reward-3/4
 *   │   ├── countdown/   1, 2, 3  (the 3-2-1 before a round)
 *   │   ├── ranks/       first … fourth, fail
 *   │   ├── bonus/       plus100, plus50, plus10, plus0
 *   │   ├── winlose/     <color>, <color>-win, <color>-lose
 *   │   └── <mode>/      icon, logo, rules, plus that game's own art
 *   │       mash/ blind/ stack/ kunai/ tsugitashi/ gauntlet/
 *   └── videos/
 *       ├── winlose/     <color>-win, <color>-lose
 *       └── blind/       <color>, <color>-win
 */
const base = import.meta.env.BASE_URL;

const image = (path: string, ext = "webp") => `${base}images/${path}.${ext}`;
const video = (path: string) => `${base}videos/${path}.mp4`;

/* ---------- audio ---------- */

/** The background music, which loops under every mode. */
export const getMusicUrl = () => `${base}music.mp3`;

/* ---------- shared UI ---------- */

export const getBackdropUrl = () => image("ui/background");
export const getBeginButtonUrl = () => image("ui/begin");
export const getContinueButtonUrl = () => image("ui/continue");
/** The "3 ninjas" / "4 ninjas" picker buttons on the menu. */
export const getPlayerCountImageUrl = (count: PlayerCount) => image(`ui/players-${count}`);
export const getRewardImageUrl = (count: PlayerCount) => image(`ui/reward-${count}`);

/** The 3-2-1 numbers before a round. */
export const getCountdownImageUrl = (n: number) => image(`countdown/${n}`, "png");

/* ---------- ranks and bonuses ---------- */

const RANK_IMAGES = ["1", "2", "3", "4"] as const;
const FAIL_IMAGE = "fail";

export const getRankImageUrl = (rank: number | null) =>
  image(
    `ranks/${
      rank !== null && rank >= 1 && rank <= RANK_IMAGES.length ? RANK_IMAGES[rank - 1] : FAIL_IMAGE
    }`,
  );

export const getBonusImageUrl = (tier: BonusTier) => image(`bonus/${tier}`);
export const getTotalImageUrl = (total: number) => image(`total/${total}`, "png");

/* ---------- per-ninja color art ---------- */

/** A ninja's card background. */
export const getColorImageUrl = (color: NinjaColor) => image(`winlose/${color}`);
export const getOutcomeImageUrl = (color: NinjaColor, outcome: Outcome) =>
  image(`winlose/${color}-${outcome}`);
export const getOutcomeVideoUrl = (color: NinjaColor, outcome: Outcome) =>
  video(`winlose/${color}-${outcome}`);

/* ---------- per-game art ---------- */

type ModeImage = "icon" | "logo" | "rules";
const MODE_IMAGE_EXT: Record<ModeImage, string> = { icon: "png", logo: "webp", rules: "webp" };

/** A game's menu icon, title logo or rules card: `images/<mode>/<kind>`. */
export const getModeImageUrl = (mode: GameMode, kind: ModeImage) =>
  image(`${mode}/${kind}`, MODE_IMAGE_EXT[kind]);

/** Shadow Strike's card art ("red", "red-hit", "red-win", "red-lose") and videos. */
export const getBlindImageUrl = (name: string) => image(`blind/${name}`, "png");
export const getBlindVideoUrl = (name: string) => video(`blind/${name}`);

/** Shinobi Stack's block art; blocks are 1-3 cells wide. */
export const getStackRowImageUrl = (cells: number) => image(`stack/row-${cells}`, "png");

/** Kunai Bullsai: the target, and each ninja's card background. */
export const getKunaiTargetUrl = () => image("kunai/target", "png");
export const getKunaiColorImageUrl = (color: NinjaColor) => image(`kunai/${color}`);

/** Ninja Gauntlet's "next game starts in" numbers (5 down to 1). */
export const getGauntletCountdownImageUrl = (n: number) => image(`gauntlet/${n}`, "png");

/** Ninja Gauntlet's standings table: the champion's crown and the Total column header. */
export const getGauntletCrownUrl = () => image("gauntlet/crown");
export const getGauntletTotalUrl = () => image("gauntlet/total");
