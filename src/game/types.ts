export type Phase = "menu" | "countdown" | "playing" | "boom" | "video" | "ended" | "results";
export type GameMode = "mash" | "blind" | "bakudan" | "wabun" | "tsugitashi";
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

export type KnockoutCause = "boom" | "fumble";

export interface Knockout {
  playerId: number;
  round: number;
  cause: KnockoutCause;
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
