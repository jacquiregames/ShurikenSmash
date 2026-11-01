import { describe, expect, it } from "vitest";
import { TSUGITASHI_MAX_TARGET, TSUGITASHI_MIN_TARGET } from "./config";
import { bustMs, counterAt } from "./tsugitashi";

describe("counterAt", () => {
  it("starts at 0 and accelerates", () => {
    expect(counterAt(0)).toBe(0);
    expect(counterAt(-50)).toBe(0);
    expect(counterAt(4000) - counterAt(3900)).toBeGreaterThan(counterAt(2000) - counterAt(1900));
  });

  it("reaches the target range in a playable 4-11 seconds", () => {
    expect(bustMs(TSUGITASHI_MIN_TARGET)).toBeGreaterThan(4000);
    expect(bustMs(TSUGITASHI_MAX_TARGET)).toBeLessThan(11_000);
  });
});

describe("bustMs", () => {
  it("is the moment the counter first goes over the target", () => {
    for (const target of [1, 999, 123_456, 999_999]) {
      expect(counterAt(bustMs(target) + 0.01)).toBeGreaterThan(target);
      expect(counterAt(bustMs(target) - 0.01)).toBeLessThanOrEqual(target);
    }
  });
});
