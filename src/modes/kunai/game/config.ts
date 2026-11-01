import type { Ninja, NinjaColor } from "../../../shared/game/types";

/* ============================================================
   Tuning, scoring and player roster for Kunai Bullseye.
   The aim bar runs from -1 (far left) to +1 (far right).
   A normalised |pos| of MATO_D is exactly the rim of the target.
   ============================================================ */

/** A seat in the match: your menu's ninja (key + color) plus the Kunai flavour text. */
export interface KunaiPlayer {
  id: number;
  /** Label of the key the player throws with (e.g. "A"). */
  key: string;
  /** Layout-independent `KeyboardEvent.code` of that key (e.g. "KeyA"). */
  code: string;
  /** Seat label, "P1".."P4". */
  label: string;
  name: string;
  jp: string;
  role: string;
  color: string;
}

/** Name, kanji and title follow the colour a player picked in the menu. */
const IDENTITY: Record<NinjaColor, { name: string; jp: string; role: string }> = {
  red: { name: "AKEMI", jp: "朱", role: "Crimson Fang" },
  yellow: { name: "FUYU", jp: "金", role: "Gilded Shadow" },
  green: { name: "HAYATE", jp: "翠", role: "Wind Step" },
  blue: { name: "RIN", jp: "蒼", role: "Moon On The Water" },
  orange: { name: "KAEDE", jp: "橙", role: "Autumn Ember" },
  purple: { name: "MURASAKI", jp: "紫", role: "Twilight Veil" },
};

/** Builds the match roster from the ninjas that are playing. */
export function buildKunaiPlayers(ninjas: readonly Ninja[]): KunaiPlayer[] {
  return ninjas.map((n, i) => ({
    id: i,
    key: n.key,
    code: n.code,
    label: `P${i + 1}`,
    color: n.color,
    ...IDENTITY[n.colorName],
  }));
}

export const ROUNDS = 3;

/** marker travel speed (normalised bar-lengths per second) per round */
export const SPEED = [0.78, 1.22, 1.78];

/** seconds on the fuse per round */
export const ROUND_TIME = [11, 9.5, 8];

/** |pos| that lands exactly on the target rim */
export const MATO_D = 0.45;

/** anything tighter than this splits the gold dot = 100 points */
export const BULLSEYE_D = 0.032;

/** ring radii, expressed in bar units (they match the drawn mato exactly) */
export const R_INNER = 0.095;
export const R_MID = 0.19;

/** half-length of the bar in centimetres, for flavour readouts */
export const BAR_CM = 26;

/** beyond this the kunai is stuck in the backboard: no points */
export const REACH = 0.62;

/** flight time of a thrown kunai, ms */
export const FLIGHT_MS = 520;

export type ZoneKey = "bull" | "inner" | "mid" | "outer" | "wood" | "off";

export const ZONES: Record<ZoneKey, { label: string; jp: string; color: string; pts: string }> = {
  bull: { label: "Bullseye", jp: "的中", color: "#e3b23c", pts: "100" },
  inner: { label: "Inner Ring", jp: "内", color: "#f4ead6", pts: "81 – 94" },
  mid: { label: "Mid Ring", jp: "中", color: "#c9603f", pts: "63 – 80" },
  outer: { label: "Outer Ring", jp: "外", color: "#4f7fa8", pts: "20 – 62" },
  wood: { label: "Backboard", jp: "板", color: "#7d6a4a", pts: "1 – 19" },
  off: { label: "Off Target", jp: "外れ", color: "#5d5f6b", pts: "0" },
};

export function zoneFor(d: number): ZoneKey {
  if (d <= BULLSEYE_D) return "bull";
  if (d <= R_INNER) return "inner";
  if (d <= R_MID) return "mid";
  if (d <= MATO_D) return "outer";
  if (d < REACH) return "wood";
  return "off";
}

export function scoreFor(d: number): number {
  if (d <= BULLSEYE_D) return 100;
  if (d >= REACH) return 0;
  const t = (REACH - d) / REACH;
  return Math.max(1, Math.round(100 * Math.pow(t, 1.25)));
}

/** rank wording for the final screen */
export function rankWord(n: number): string {
  return ["CHAMPION", "SECOND", "THIRD", "FOURTH"][n] ?? "";
}
