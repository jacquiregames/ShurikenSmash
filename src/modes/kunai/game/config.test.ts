import { describe, expect, it } from "vitest";
import { DEFAULT_NINJAS, withColor } from "../../../shared/game/ninjas";
import { BULLSEYE_D, MATO_D, REACH, buildKunaiPlayers, scoreFor, zoneFor } from "./config";

describe("kunai scoring", () => {
  it("scores a bullseye 100 and anything past the reach 0", () => {
    expect(scoreFor(0)).toBe(100);
    expect(scoreFor(BULLSEYE_D)).toBe(100);
    expect(scoreFor(REACH)).toBe(0);
    expect(scoreFor(REACH + 0.1)).toBe(0);
  });

  it("scores closer throws higher, never below 1 on the board", () => {
    expect(scoreFor(0.1)).toBeGreaterThan(scoreFor(0.3));
    expect(scoreFor(REACH - 0.001)).toBeGreaterThanOrEqual(1);
  });

  it("maps distance to zones", () => {
    expect(zoneFor(0)).toBe("bull");
    expect(zoneFor(0.05)).toBe("inner");
    expect(zoneFor(0.15)).toBe("mid");
    expect(zoneFor(MATO_D)).toBe("outer");
    expect(zoneFor(0.5)).toBe("wood");
    expect(zoneFor(REACH)).toBe("off");
  });
});

describe("buildKunaiPlayers", () => {
  it("uses the menu keys and colors, one seat per ninja", () => {
    const players = buildKunaiPlayers(DEFAULT_NINJAS.slice(0, 3));
    expect(players).toHaveLength(3);
    expect(players.map((p) => p.key)).toEqual(["A", "F", "H"]);
    expect(players.map((p) => p.code)).toEqual(["KeyA", "KeyF", "KeyH"]);
    expect(players.map((p) => p.label)).toEqual(["P1", "P2", "P3"]);
    expect(players[0].color).toBe(DEFAULT_NINJAS[0].color);
  });

  it("gives each colour its own name so seats stay distinguishable", () => {
    const players = buildKunaiPlayers(
      (["red", "yellow", "green", "blue"] as const).map((c, i) => withColor(DEFAULT_NINJAS[i], c)),
    );
    expect(new Set(players.map((p) => p.name)).size).toBe(4);
    const six = buildKunaiPlayers(
      (["red", "yellow", "green", "blue", "orange", "purple"] as const).map((c) =>
        withColor(DEFAULT_NINJAS[0], c),
      ),
    );
    expect(new Set(six.map((p) => p.name)).size).toBe(6);
  });
});
