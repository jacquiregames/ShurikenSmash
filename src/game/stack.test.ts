import { describe, expect, it } from "vitest";
import {
  MAX_SPEED_MS,
  MIN_SPEED_MS,
  STACK_COLS,
  advanceBlock,
  overlapWith,
  rankForRows,
  speedForRows,
  speedTier,
} from "./stack";

describe("stack logic", () => {
  it("bounces the moving block off both edges", () => {
    const right = advanceBlock({ x: STACK_COLS - 3, width: 3, dir: 1 });
    expect(right).toEqual({ x: STACK_COLS - 3, width: 3, dir: -1 });
    expect(advanceBlock({ x: 0, width: 3, dir: -1 })).toEqual({ x: 0, width: 3, dir: 1 });
    expect(advanceBlock({ x: 2, width: 3, dir: 1 }).x).toBe(3);
  });

  it("trims to the overlap and returns null when there is none", () => {
    expect(overlapWith({ x: 2, width: 3 }, { x: 0, width: 3 })).toEqual({ x: 2, width: 1 });
    expect(overlapWith({ x: 3, width: 2 }, { x: 0, width: 3 })).toBeNull();
  });

  it("speeds up as the tower grows, within bounds", () => {
    expect(speedForRows(0)).toBe(MAX_SPEED_MS);
    expect(speedForRows(100)).toBe(MIN_SPEED_MS);
    expect(speedForRows(5)).toBeLessThan(speedForRows(1));
  });

  it("maps speed and height to tiers and ranks", () => {
    expect(speedTier(0)).toBe("walk");
    expect(speedTier(100)).toBe("lightning");
    expect(rankForRows(0)).toBe("GENIN");
    expect(rankForRows(11)).toBe("KAGE");
    expect(rankForRows(99)).toBe("KAGE");
  });
});
