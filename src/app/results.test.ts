import { describe, expect, it } from "vitest";
import { DEFAULT_NINJAS } from "../shared/game/ninjas";
import { computeResults } from "./results";

const players = DEFAULT_NINJAS;

describe("computeResults (mash)", () => {
  it("ranks by score and shares rank on ties", () => {
    const r = computeResults({ mode: "mash", players, counts: [10, 10, 4, 0], strikeTimes: [] });
    expect([0, 1, 2, 3].map((i) => r.byPlayer[i].rank)).toEqual([1, 1, 3, 4]);
    expect([...r.winnerIds]).toEqual([0, 1]);
  });

  it("declares no winner when nobody struck", () => {
    const r = computeResults({ mode: "mash", players, counts: [0, 0, 0, 0], strikeTimes: [] });
    expect(r.winnerIds.size).toBe(0);
    expect(r.byPlayer[0].rank).toBeNull();
    expect(r.byPlayer[0].bonusImage).toBeUndefined();
  });

  it("assigns bonus tiers correctly for 4 players", () => {
    const r = computeResults({ mode: "mash", players, counts: [10, 8, 6, 4], strikeTimes: [] });
    expect(r.byPlayer[0].bonusImage).toContain("plus200");
    expect(r.byPlayer[1].bonusImage).toContain("plus100");
    expect(r.byPlayer[2].bonusImage).toContain("plus50");
    expect(r.byPlayer[3].bonusImage).toContain("plus0");
  });

  it("assigns bonus tiers correctly for 3 players (3rd receives plus0 placeholder)", () => {
    const players3 = players.slice(0, 3);
    const r = computeResults({
      mode: "mash",
      players: players3,
      counts: [10, 8, 6],
      strikeTimes: [],
    });
    expect(r.byPlayer[0].bonusImage).toContain("plus200");
    expect(r.byPlayer[1].bonusImage).toContain("plus100");
    expect(r.byPlayer[2].bonusImage).toContain("plus0");
  });
});

describe("computeResults (blind)", () => {
  it("ranks closest to zero first and fails players who never struck", () => {
    const r = computeResults({
      mode: "blind",
      players,
      counts: [],
      strikeTimes: [0.4, 0.05, undefined, 2],
    });
    expect(r.byPlayer[1].rank).toBe(1);
    expect(r.byPlayer[0].rank).toBe(2);
    expect(r.byPlayer[3].rank).toBe(3);
    expect(r.byPlayer[2].rank).toBeNull();
    expect(r.byPlayer[2].rankLabel).toBe("FAIL");
    expect([...r.winnerIds]).toEqual([1]);
  });

  it("has no winner when everyone fails", () => {
    const r = computeResults({ mode: "blind", players, counts: [], strikeTimes: [] });
    expect(r.winnerIds.size).toBe(0);
  });
});

describe("computeResults (stack)", () => {
  const tower = (
    height: number,
    status: "climbing" | "fallen" | "summit",
    finishedAtMs: number | null = null,
  ) => ({
    rows: Array.from({ length: height }, () => ({ x: 0, width: 1 })),
    status,
    finishedAtMs,
  });

  it("ranks summiters by speed ahead of everyone else, then by height", () => {
    const r = computeResults({
      mode: "stack",
      players,
      counts: [],
      strikeTimes: [],
      stacks: [
        tower(11, "summit", 20_000),
        tower(11, "summit", 15_000),
        tower(7, "fallen", 9_000),
        tower(4, "climbing"),
      ],
    });
    expect([0, 1, 2, 3].map((i) => r.byPlayer[i].rank)).toEqual([2, 1, 3, 4]);
    expect([...r.winnerIds]).toEqual([1]);
    expect(r.byPlayer[1].scoreLabel).toBe("Summit in 15.00s");
    expect(r.byPlayer[2].scoreLabel).toBe("Height 7/11");
  });

  it("shares a rank on equal height and has no winner when nobody stacked", () => {
    const tied = computeResults({
      mode: "stack",
      players,
      counts: [],
      strikeTimes: [],
      stacks: [
        tower(5, "fallen", 1),
        tower(5, "climbing"),
        tower(2, "fallen", 1),
        tower(0, "fallen", 1),
      ],
    });
    expect([0, 1, 2, 3].map((i) => tied.byPlayer[i].rank)).toEqual([1, 1, 3, 4]);

    const none = computeResults({
      mode: "stack",
      players,
      counts: [],
      strikeTimes: [],
      stacks: [
        tower(0, "fallen", 1),
        tower(0, "fallen", 1),
        tower(0, "fallen", 1),
        tower(0, "fallen", 1),
      ],
    });
    expect(none.winnerIds.size).toBe(0);
    expect(none.byPlayer[0].rankLabel).toBe("NO BLOCKS");
  });
});

describe("computeResults (tsugitashi)", () => {
  const input = (locked: (number | undefined)[]) => ({
    mode: "tsugitashi" as const,
    players,
    counts: [],
    strikeTimes: [],
    target: 500_000,
    locked,
  });

  it("ranks closest without going over, and busts anyone over", () => {
    const r = computeResults(input([400_000, 500_001, 499_000, 900]));
    expect([0, 1, 2, 3].map((i) => r.byPlayer[i].rank)).toEqual([2, null, 1, 3]);
    expect([...r.winnerIds]).toEqual([2]);
    expect(r.byPlayer[1].rankLabel).toBe("BUST");
    expect(r.byPlayer[2].scoreLabel).toBe("1,000 short");
  });

  it("calls out an exact hit, shares ties, and has no winner if everyone busts", () => {
    expect(computeResults(input([500_000, 0, 0, 0])).byPlayer[0].scoreLabel).toBe("EXACT! 500,000");
    expect([...computeResults(input([10, 10, 5, 600_000])).winnerIds]).toEqual([0, 1]);
    expect(computeResults(input([6e5, 6e5, 6e5, 6e5])).winnerIds.size).toBe(0);
  });
});
