import { describe, expect, it } from "vitest";
import { DEFAULT_NINJAS } from "../../../shared/game/ninjas";
import {
  BULLSEYE_D,
  MATO_D,
  REACH,
  TARGET_RADIUS_PX,
  TARGET_RINGS,
  buildKunaiPlayers,
  scoreFor,
  zoneFor,
} from "./config";

describe("kunai scoring", () => {
  const dAt = (px: number) => (px / TARGET_RADIUS_PX) * MATO_D;

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

  it("never pays more for a throw further from the centre", () => {
    let prev = Infinity;
    for (let d = 0; d <= REACH; d += 0.001) {
      const pts = scoreFor(d);
      expect(pts).toBeLessThanOrEqual(prev);
      prev = pts;
    }
  });

  it("maps distance to the painted rings", () => {
    expect(zoneFor(0)).toBe("bull");
    expect(zoneFor(dAt(100))).toBe("red");
    expect(zoneFor(dAt(200))).toBe("green");
    expect(zoneFor(dAt(300))).toBe("blueIn");
    expect(zoneFor(dAt(400))).toBe("gold");
    expect(zoneFor(dAt(500))).toBe("blueOut");
    expect(zoneFor(dAt(600))).toBe("lava");
    expect(zoneFor(dAt(685))).toBe("rim");
    expect(zoneFor(0.5)).toBe("wood");
    expect(zoneFor(REACH)).toBe("off");
  });

  it("pays each ring inside its own point range", () => {
    let inner = BULLSEYE_D;
    for (const ring of TARGET_RINGS.slice(1)) {
      const outer = dAt(ring.outer);
      const mid = scoreFor((inner + outer) / 2);
      expect(mid).toBeLessThanOrEqual(ring.hi);
      expect(mid).toBeGreaterThanOrEqual(ring.lo);
      inner = outer;
    }
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

  it("names each seat after its menu player", () => {
    const players = buildKunaiPlayers(DEFAULT_NINJAS.slice(0, 4));
    expect(players.map((p) => p.name)).toEqual(DEFAULT_NINJAS.slice(0, 4).map((n) => n.name));
    expect(new Set(players.map((p) => p.name)).size).toBe(4);
  });
});
