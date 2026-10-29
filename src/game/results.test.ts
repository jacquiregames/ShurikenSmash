import { describe, expect, it } from "vitest";
import { DEFAULT_NINJAS } from "./ninjas";
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
    expect(r.byPlayer[0].bonusImage).toContain("plus100");
    expect(r.byPlayer[1].bonusImage).toContain("plus50");
    expect(r.byPlayer[2].bonusImage).toContain("plus10");
    expect(r.byPlayer[3].bonusImage).toContain("plus0");
  });

  it("assigns bonus tiers correctly for 3 players (3rd receives plus0 placeholder)", () => {
    const players3 = players.slice(0, 3);
    const r = computeResults({ mode: "mash", players: players3, counts: [10, 8, 6], strikeTimes: [] });
    expect(r.byPlayer[0].bonusImage).toContain("plus100");
    expect(r.byPlayer[1].bonusImage).toContain("plus50");
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
describe("computeResults (bakudan)", () => {
  it("ranks by how long each ninja survived", () => {
    const r = computeResults({
      mode: "bakudan",
      players,
      counts: [],
      strikeTimes: [],
      knockouts: [
        { playerId: 2, round: 1, cause: "fumble" },
        { playerId: 0, round: 1, cause: "boom" },
        { playerId: 3, round: 2, cause: "boom" },
      ],
    });
    expect([0, 1, 2, 3].map((i) => r.byPlayer[i].rank)).toEqual([3, 1, 4, 2]);
    expect([...r.winnerIds]).toEqual([1]);
    expect(r.byPlayer[2].scoreLabel).toBe("Fumbled · Round 1");
  });
});

describe("computeResults (wabun)", () => {
  it("crowns whoever spelled the word and ranks the rest by progress", () => {
    const r = computeResults({ mode: "wabun", players, counts: [], strikeTimes: [], progress: [2, 4, 0, 2], wordLength: 4 });
    expect([0, 1, 2, 3].map((i) => r.byPlayer[i].rank)).toEqual([2, 1, 4, 2]);
    expect([...r.winnerIds]).toEqual([1]);
    expect(r.byPlayer[0].scoreLabel).toBe("2 / 4 Sent");
  });

  it("has no winner when time runs out", () => {
    const r = computeResults({ mode: "wabun", players, counts: [], strikeTimes: [], progress: [3, 1, 0, 0], wordLength: 4 });
    expect(r.winnerIds.size).toBe(0);
    expect(r.byPlayer[0].rankLabel).toBe("TIME UP");
  });
});
