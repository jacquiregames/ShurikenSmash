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
