import type { GameMode, NinjaColor, Outcome, PlayerCount, BonusTier } from "./types";

/* ---------- Timing ---------- */
export const GAME_MS = 10_000;
export const COUNTDOWN_START = 3;
/** How long "STRIKE!" stays on screen before the round starts. */
export const COUNTDOWN_GO_MS = 600;
export const BLIND_THRESHOLD_MS = 5_000;
/** Bakudan fuse length is random per round within this range (and hidden from players). */
export const BAKUDAN_MIN_MS = 10_000;
export const BAKUDAN_MAX_MS = 20_000;
/** Wabun: time limit to spell the word. */
export const WABUN_MS = 90_000;
/** Wabun: a press held at least this long is a dash; shorter is a dot. */
export const WABUN_DASH_MS = 200;
/** Tsugitashi: round length, and the range the random target is drawn from. */
export const TSUGITASHI_MS = 20_000;
export const TSUGITASHI_MIN_TARGET = 1_000_000;
export const TSUGITASHI_MAX_TARGET = 2_000_000;
/**
 * Tsugitashi: a hold adds e^(heldMs / this), so ~7s of holding reaches the target range.
 * Lower it to accelerate faster.
 */
export const TSUGITASHI_GROWTH_MS = 500;
/** How long an elimination is shown before the next Bakudan round's countdown. */
export const BOOM_HOLD_MS = 2_500;
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
  { title: string; logoImage?: string; rulesImage?: string; rules?: readonly string[] }
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
  bakudan: {
    title: "BAKUDAN",
    rules: [
      "Music plays while the fuse burns — nobody knows for how long.",
      "Holding the bakudan? Press your key to pass it to the next ninja.",
      "Press your key without the bakudan and you're out!",
      "Holding it when the music stops? BOOM — you're out.",
      "Last ninja standing wins.",
    ],
  },
  wabun: {
    title: "WABUN",
    rules: [
      "A sushi word appears — spell it in Wabun (Japanese Morse) code.",
      "Tap your button for a dot ・, hold it for a dash －.",
      "Voiced kana like GU are two characters: KU then the ゛ mark.",
      "One wrong dot or dash sends you back to the start of the word.",
      "First ninja to spell the whole word wins!",
    ],
  },
  tsugitashi: {
    title: "TSUGITASHI",
    rules: [
      "A target number appears. Add up to it — without going over!",
      "Tap your button to add 1.",
      "Hold it to keep adding — faster and faster the longer you hold.",
      "Let go before it overshoots, then hold again to creep closer.",
      "Go over and you BUST. Closest without going over wins after 20 seconds.",
    ],
  },
};
