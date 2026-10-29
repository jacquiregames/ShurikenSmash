import { describe, expect, it } from "vitest";
import { gamepadButtonCode, gamepadTimestamp, newlyPressed } from "./gamepad";

describe("newlyPressed", () => {
  it("reports only released -> pressed transitions", () => {
    expect(newlyPressed([false, true, false, false], [true, true, false, true])).toEqual([0, 3]);
  });

  it("does not repeat a held button", () => {
    expect(newlyPressed([true, false], [true, false])).toEqual([]);
  });

  it("treats buttons with no previous state as released", () => {
    expect(newlyPressed([], [false, true])).toEqual([1]);
  });
});

describe("gamepadButtonCode", () => {
  it("maps buttons to player key codes and ignores unmapped buttons", () => {
    expect([0, 1, 2, 3].map(gamepadButtonCode)).toEqual(["KeyA", "KeyF", "KeyH", "KeyL"]);
    expect(gamepadButtonCode(9)).toBeUndefined();
  });
});

describe("gamepadTimestamp", () => {
  it("uses the report timestamp when valid", () => {
    expect(gamepadTimestamp(1234.5, 1240)).toBe(1234.5);
  });

  it("falls back to now for missing or future timestamps", () => {
    expect(gamepadTimestamp(0, 1240)).toBe(1240);
    expect(gamepadTimestamp(1300, 1240)).toBe(1240);
  });
});
