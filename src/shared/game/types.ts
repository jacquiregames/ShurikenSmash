/**
 * `kunai` is the phase while Kunai Bullseye runs; it manages its own rounds and results.
 * `finale` is the Ninja Gauntlet standings screen after its last game.
 */
export type Phase =
  "menu" | "countdown" | "playing" | "video" | "ended" | "results" | "kunai" | "finale";
export type GameMode = "mash" | "blind" | "stack" | "kunai" | "tsugitashi" | "gauntlet";
export type PlayerCount = 3 | 4;
export type Outcome = "win" | "lose";
export type NinjaColor = "blue" | "green" | "orange" | "purple" | "red" | "yellow";
export type BonusTier = "plus200" | "plus100" | "plus50" | "plus0";

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
  bgImage: string;
}

export interface PlayerResultInfo {
  /** 1-based competition rank; `null` for players who failed / nobody scored. */
  rank: number | null;
  rankLabel: string;
  rankImage: string;
  scoreLabel: string;
  bonusImage?: string;
}

/** A tiny external store holding the round clock, so only the timer re-renders each frame. */
export interface Clock {
  getSnapshot: () => number;
  subscribe: (listener: () => void) => () => void;
  set: (value: number) => void;
}
