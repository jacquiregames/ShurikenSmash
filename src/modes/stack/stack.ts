import type { MovingBlock, Row, StackPlayer } from "./types";

/* ---------- Board geometry (grid units) ---------- */
export const STACK_COLS = 8;
export const STACK_ROWS = 11;
export const START_WIDTH = 3;

/* ---------- Speed curve: slow start, ramps every row ---------- */
/** Slowest tick interval (ms), used for the first row. */
export const MAX_SPEED_MS = 180;
/** Fastest tick interval (ms). */
export const MIN_SPEED_MS = 32;
const SPEED_RAMP = (MAX_SPEED_MS - MIN_SPEED_MS) / (STACK_ROWS - 1);

export const MAX_ACTIVE_BURSTS = 5;
/** Upper bound on moves processed per tick if the tab was throttled. */
export const MAX_CATCH_UP_MOVES = 4;

/** A fresh moving block at the left edge. */
export function newMovingBlock(width: number = START_WIDTH): MovingBlock {
  return { x: 0, width, dir: 1 };
}

export function createStackPlayer(): StackPlayer {
  return {
    rows: [],
    current: newMovingBlock(),
    status: "climbing",
    nextMoveAt: 0,
    finishedAtMs: null,
    bursts: [],
  };
}

/** Tick interval (ms) for a tower that is `rowCount` rows high. */
export function speedForRows(rowCount: number): number {
  return Math.max(MIN_SPEED_MS, Math.round(MAX_SPEED_MS - rowCount * SPEED_RAMP));
}

/** Move the block one cell, bouncing off the board edges. */
export function advanceBlock(block: MovingBlock): MovingBlock {
  let x = block.x + block.dir;
  let dir = block.dir;
  if (x + block.width > STACK_COLS) {
    x = STACK_COLS - block.width;
    dir = -1;
  }
  if (x < 0) {
    x = 0;
    dir = 1;
  }
  return { ...block, x, dir };
}

/** The part of `block` that rests on `support`, or `null` if they don't overlap. */
export function overlapWith(block: Row, support: Row): Row | null {
  const left = Math.max(block.x, support.x);
  const right = Math.min(block.x + block.width, support.x + support.width);
  const width = right - left;
  return width > 0 ? { x: left, width } : null;
}
