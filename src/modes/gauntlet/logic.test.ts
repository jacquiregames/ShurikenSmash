import { describe, expect, it } from "vitest";
import {
  GAUNTLET_COUNTDOWN,
  GAUNTLET_GAMES,
  gauntletTotals,
  initialGauntlet,
  isLastGame,
  recordGame,
} from "./logic";

describe("ninja gauntlet scoring", () => {
  it("plays every other game once", () => {
    expect([...GAUNTLET_GAMES].sort()).toEqual(["blind", "kunai", "mash", "stack", "tsugitashi"]);
  });

  it("totals the bonus each finishing place paid", () => {
    const run = {
      ranks: [
        [1, 2, 3, 4],
        [2, 1, 4, 3],
      ],
    };
    expect(gauntletTotals(run, 4)).toEqual([150, 150, 10, 10]);
  });

  it("pays 3 players 100 / 50 / 0, and nothing for a player who did not place", () => {
    const run = {
      ranks: [
        [1, 2, 3],
        [null, 1, 2],
      ],
    };
    expect(gauntletTotals(run, 3)).toEqual([100, 150, 50]);
  });

  it("shares a tier between tied places", () => {
    expect(gauntletTotals({ ranks: [[1, 1, 3, 4]] }, 4)).toEqual([100, 100, 10, 0]);
  });

  it("records a game once and starts the countdown", () => {
    const run = recordGame(initialGauntlet(), [1, 2, 3, 4]);
    expect(run.nextIn).toBe(GAUNTLET_COUNTDOWN);
    expect(run.ranks).toHaveLength(1);
    expect(recordGame(run, [4, 3, 2, 1])).toBe(run);
  });

  it("knows the last game", () => {
    expect(isLastGame(initialGauntlet())).toBe(false);
    expect(isLastGame({ ...initialGauntlet(), index: GAUNTLET_GAMES.length - 1 })).toBe(true);
  });
});
