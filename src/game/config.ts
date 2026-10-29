/* ---------- Types ---------- */
export type Phase = "menu" | "countdown" | "playing" | "video" | "ended" | "results";
export type GameMode = "mash" | "blind";
export type PlayerCount = 3 | 4;
export type Outcome = "win" | "lose";
export type NinjaColor = "blue" | "green" | "orange" | "purple" | "red" | "yellow";
export type BonusTier = "plus100" | "plus50" | "plus10" | "plus0";

export interface Ninja {
  id: number;
  name: string;
  /** Label shown on the keycap (e.g. "A"). */
  key: string;
  /** Layout-independent `KeyboardEvent.code` used for matching (e.g. "KeyA"). */
  code: string;
  colorName: NinjaColor;
  color: string;
  glow: string;
  kanji: string;
  bgImage: string;
}

export interface Hit {
  id: number;
  x: number;
  y: number;
  rot: number;
}

export interface PlayerResultInfo {
  /** 1-based competition rank; `null` for players who failed / nobody scored. */
  rank: number | null;
  rankLabel: string;
  rankImage: string;
  scoreLabel: string;
  bonusImage?: string;
}

export interface Clock {
  getSnapshot: () => number;
  subscribe: (listener: () => void) => () => void;
  set: (value: number) => void;
}

/* ---------- Timing ---------- */
export const GAME_MS = 10_000;
export const COUNTDOWN_START = 3;
export const BLIND_THRESHOLD_MS = 5_000;
/** Safety net: the round moves on even if a video never fires `ended`. */
export const VIDEO_FALLBACK_MS = 12_000;
/** How long the static win/lose art is shown before the results appear. */
export const ENDED_HOLD_MS = 2000;
/** Ignore keyboard "confirm" presses right after results appear (mashing guard). */
export const RESULTS_INPUT_LOCK_MS = 1_000;

/* ---------- Players ---------- */
export const MAX_PLAYERS = 4;
export const PLAYER_COUNTS: readonly PlayerCount[] = [3, 4];
export const MAX_VISIBLE_HITS = 8;
/**
 * Gamepad button index -> player id, for arcade buttons on a USB encoder board.
 * Reorder to match how the buttons are wired (check indices in DevTools via `navigator.getGamepads()`).
 */
export const GAMEPAD_BUTTON_PLAYERS: readonly number[] = [0, 1, 2, 3];

/* ---------- Asset URLs ---------- */
const base = import.meta.env.BASE_URL;

export const getImageUrl = (name: string, ext = "webp") => `${base}images/${name}.${ext}`;
export const getRewardImageUrl = (count: PlayerCount) => getImageUrl(`reward${count}`);
export const getOutcomeImageUrl = (colorName: NinjaColor, outcome: Outcome) =>
  `${base}images/winlose/${colorName}-${outcome}.webp`;
export const getOutcomeVideoUrl = (colorName: NinjaColor, outcome: Outcome) =>
  `${base}videos/winlose/${colorName}-${outcome}.mp4`;
export const getBonusImageUrl = (name: BonusTier) => `${base}images/${name}.webp`;

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
  { title: string; logoImage: string; rulesImage: string }
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
};