/** `kunai` is the phase while Kunai Bullseye runs; it manages its own rounds and results. */
export type Phase = "menu" | "countdown" | "playing" | "video" | "ended" | "results" | "kunai";
export type GameMode = "mash" | "blind" | "stack" | "kunai";
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

/* ---------- Shinobi Stack ---------- */

/** A block locked into a tower (grid units). */
export interface Row {
  x: number;
  width: number;
}

/** The block currently sweeping back and forth (grid units). */
export interface MovingBlock extends Row {
  /** 1 = moving right, -1 = moving left. */
  dir: 1 | -1;
}

/** Shuriken burst played when a block lands (grid units). */
export interface Burst {
  id: number;
  /** Horizontal centre, in columns. */
  cx: number;
  /** Row index the block landed on. */
  level: number;
}

export type SpeedTier = "walk" | "run" | "wind" | "lightning";
export type StackStatus = "climbing" | "fallen" | "summit";

export interface StackPlayer {
  rows: Row[];
  current: MovingBlock;
  status: StackStatus;
  /** `performance.now()` timestamp at which the moving block next advances. */
  nextMoveAt: number;
  /** Milliseconds into the round when the player fell or summited. */
  finishedAtMs: number | null;
  bursts: Burst[];
}
