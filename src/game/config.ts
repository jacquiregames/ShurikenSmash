import type { GameMode, NinjaColor, Outcome, PlayerCount, BonusTier } from "./types";

/* ---------- Timing ---------- */
/** Round length per game mode. */
export const ROUND_MS: Record<GameMode, number> = {
  mash: 10_000,
  blind: 10_000,
  stack: 30_000,
  /** Unused: Kunai Bullseye runs its own per-round fuse timer. */
  kunai: 10_000,
  /** Safety cap only: a Tsugitashi round ends when the counter passes the target. */
  tsugitashi: 15_000,
};
export const COUNTDOWN_START = 3;
/** How long "STRIKE!" stays on screen before the round starts. */
export const COUNTDOWN_GO_MS = 600;
export const BLIND_THRESHOLD_MS = 5_000;
/** Safety net: the round moves on even if a video never fires `ended`. */
export const VIDEO_FALLBACK_MS = 12_000;
/** How long the static win/lose art is shown before the results appear. */
export const ENDED_HOLD_MS = 2000;
/** Ignore keyboard "confirm" presses right after results appear (mashing guard). */
export const RESULTS_INPUT_LOCK_MS = 1_000;
/** Tsugitashi: the range the random target is drawn from. */
export const TSUGITASHI_MIN_TARGET = 100_000;
export const TSUGITASHI_MAX_TARGET = 999_999;
/**
 * Tsugitashi: the shared counter reads (elapsedMs / this)^3, so it accelerates and
 * reaches the target range after roughly 4.5-10 seconds. Lower it to speed things up.
 */
export const TSUGITASHI_STEP_MS = 100;

/* ---------- Players ---------- */
export const MAX_PLAYERS = 4;
export const PLAYER_COUNTS: readonly PlayerCount[] = [3, 4];
export const MAX_VISIBLE_HITS = 8;

/* ---------- Asset URLs ---------- */
const base = import.meta.env.BASE_URL;

export const getImageUrl = (name: string, ext = "webp") => `${base}images/${name}.${ext}`;
export const getRewardImageUrl = (count: PlayerCount) => getImageUrl(`reward${count}`);
export const getOutcomeImageUrl = (colorName: NinjaColor, outcome: Outcome) =>
  `${base}images/winlose/${colorName}-${outcome}.webp`;
export const getOutcomeVideoUrl = (colorName: NinjaColor, outcome: Outcome) =>
  `${base}videos/winlose/${colorName}-${outcome}.mp4`;
export const getBonusImageUrl = (name: BonusTier) => `${base}images/${name}.webp`;
/** Art overlaid on a stack block. Blocks are 1-3 cells wide. */
export const getRowImageUrl = (width: number) => {
  const cells = Math.min(3, Math.max(1, Math.round(width)));
  return getImageUrl(`${cells}x1row`, "png");
};

export const getRankImageUrl = (rank: number | null) => {
  switch (rank) {
    case 1:
      return `${base}images/first.webp`;
    case 2:
      return `${base}images/second.webp`;
    case 3:
      return `${base}images/third.webp`;
    case 4:
      return `${base}images/forth.webp`;
    default:
      return `${base}images/fail.webp`;
  }
};

/* ---------- Colors ---------- */
export const COLOR_OPTIONS: Record<
  NinjaColor,
  { label: string; color: string; glow: string; bgImage: string }
> = {
  red: { label: "Red", color: "#ff3b4e", glow: "rgba(255, 59, 78, 0.7)", bgImage: getImageUrl("red") },
  green: { label: "Green", color: "#2ee6a0", glow: "rgba(46, 230, 160, 0.7)", bgImage: getImageUrl("green") },
  blue: { label: "Blue", color: "#3fa9ff", glow: "rgba(63, 169, 255, 0.7)", bgImage: getImageUrl("blue") },
  yellow: { label: "Yellow", color: "#ffc93c", glow: "rgba(255, 201, 60, 0.7)", bgImage: getImageUrl("yellow") },
  orange: { label: "Orange", color: "#ff822d", glow: "rgba(255, 130, 45, 0.7)", bgImage: getImageUrl("orange") },
  purple: { label: "Purple", color: "#bd4bff", glow: "rgba(189, 75, 255, 0.7)", bgImage: getImageUrl("purple") },
};

export const AVAILABLE_COLORS = Object.keys(COLOR_OPTIONS) as NinjaColor[];

/* ---------- Modes ---------- */
export const MODE_DETAILS: Record<
  GameMode,
  {
    title: string;
    /** Modes without logo/rules art fall back to the title and the `rules` text. */
    logoImage?: string;
    rulesImage?: string;
    rules?: readonly string[];
  }
> = {
  mash: {
    title: "SHURIKEN SMASH",
    logoImage: getImageUrl("shuriken-smash"),
    rulesImage: getImageUrl("smash-rules"),
  },
  blind: {
    title: "SHADOW STRIKE",
    logoImage: getImageUrl("shadow-strike"),
    rulesImage: getImageUrl("strike-rules"),
  },
  stack: {
    title: "SHINOBI STACK",
    logoImage: getImageUrl("shinobi-stack"),
    rulesImage: getImageUrl("stack-rules"),
  },
  kunai: {
    title: "KUNAI BULLSEYE",
    logoImage: getImageUrl("kunai-bullseye"),
    rulesImage: getImageUrl("kunai-rules"),
  },
  tsugitashi: {
    title: "TSUGITASHI",
    rules: [
      "Every ninja holds their button down to start.",
      "One counter climbs toward the target, faster and faster.",
      "Let go to lock in the number it shows.",
      "Hold past the target and you BUST.",
      "Closest without going over wins!",
    ],
  },
};

/** Modes that end with the win/lose videos and art. Stack and Kunai show their own end screens. */
export const usesOutcomeMedia = (mode: GameMode) =>
  mode === "mash" || mode === "blind" || mode === "tsugitashi";