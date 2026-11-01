import { replaceAt } from "../../shared/game/collections";
import { MAX_PLAYERS } from "../../shared/config/players";
import {
  MAX_ACTIVE_BURSTS,
  MAX_CATCH_UP_MOVES,
  STACK_ROWS,
  advanceBlock,
  createStackPlayer,
  newMovingBlock,
  overlapWith,
  speedForRows,
} from "./stack";
import type { StackPlayer } from "./types";

/** Shinobi Stack: one tower per seat; the moving block bounces until its owner drops it. */
export interface StackRound {
  towers: StackPlayer[];
}

export const initialStackRound = (): StackRound => ({
  towers: Array.from({ length: MAX_PLAYERS }, createStackPlayer),
});

/** Starts every tower's clock when play begins. */
export const startTowers = (round: StackRound, at: number): StackRound => ({
  towers: round.towers.map((p) => ({ ...p, nextMoveAt: at + speedForRows(0) })),
});

/**
 * Locks the climbing block of `seat` onto its tower (or topples the tower).
 * `burstId` must be unique; returns the same round if that tower is not climbing.
 */
export function dropBlock(
  round: StackRound,
  seat: number,
  at: number,
  elapsedMs: number,
  burstId: number,
): StackRound {
  const player = round.towers[seat];
  if (!player || player.status !== "climbing") return round;

  // The first block always lands; later blocks are trimmed to the overlap.
  const top = player.rows[player.rows.length - 1];
  const landed = top
    ? overlapWith(player.current, top)
    : { x: player.current.x, width: player.current.width };

  let next: StackPlayer;
  if (!landed) {
    next = { ...player, status: "fallen", finishedAtMs: elapsedMs };
  } else {
    const rows = [...player.rows, landed];
    const bursts = [
      ...player.bursts.slice(-(MAX_ACTIVE_BURSTS - 1)),
      { id: burstId, cx: landed.x + landed.width / 2, level: rows.length - 1 },
    ];
    next =
      rows.length >= STACK_ROWS
        ? { ...player, rows, bursts, status: "summit", finishedAtMs: elapsedMs }
        : {
            ...player,
            rows,
            bursts,
            current: newMovingBlock(landed.width),
            nextMoveAt: at + speedForRows(rows.length),
          };
  }
  return { towers: replaceAt(round.towers, seat, () => next) };
}

/** Advances every climbing tower's moving block that is due. Returns the same round if none is. */
export function advanceTowers(round: StackRound, numPlayers: number, at: number): StackRound {
  let changed = false;
  const towers = round.towers.map((p, i) => {
    if (i >= numPlayers || p.status !== "climbing" || at < p.nextMoveAt) return p;
    let { current, nextMoveAt } = p;
    const interval = speedForRows(p.rows.length);
    for (let n = 0; n < MAX_CATCH_UP_MOVES && at >= nextMoveAt; n++) {
      current = advanceBlock(current);
      nextMoveAt += interval;
    }
    if (at >= nextMoveAt) nextMoveAt = at + interval; // resync after a long stall
    changed = true;
    return { ...p, current, nextMoveAt };
  });
  return changed ? { towers } : round;
}

/** When the next block is due to move (`null` if nothing is moving). */
export function nextTowerDue(round: StackRound, numPlayers: number): number | null {
  let due: number | null = null;
  for (const p of round.towers.slice(0, numPlayers)) {
    if (p.status === "climbing" && (due === null || p.nextMoveAt < due)) due = p.nextMoveAt;
  }
  return due;
}

export const everyoneDone = (round: StackRound, numPlayers: number) =>
  round.towers.slice(0, numPlayers).every((p) => p.status !== "climbing");

export const removeBurst = (round: StackRound, seat: number, burstId: number): StackRound => {
  if (!round.towers[seat]?.bursts.some((b) => b.id === burstId)) return round;
  return {
    towers: replaceAt(round.towers, seat, (p) => ({
      ...p,
      bursts: p.bursts.filter((b) => b.id !== burstId),
    })),
  };
};
