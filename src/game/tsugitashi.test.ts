import { describe, expect, it } from "vitest";
import { TSUGITASHI_MAX_TARGET, TSUGITASHI_MIN_TARGET } from "./config";
import { holdAmount } from "./tsugitashi";

describe("holdAmount", () => {
  it("adds 1 for a tap", () => {
    expect(holdAmount(0)).toBe(1);
    expect(holdAmount(120)).toBe(1);
  });

  it("accelerates the longer it is held", () => {
    expect(holdAmount(2000)).toBeLessThan(holdAmount(4000));
    expect(holdAmount(4000) - holdAmount(3900)).toBeGreaterThan(holdAmount(2000) - holdAmount(1900));
  });

  it("reaches the target range after roughly 7 seconds of holding", () => {
    expect(holdAmount(6_500)).toBeLessThan(TSUGITASHI_MIN_TARGET);
    expect(holdAmount(7_500)).toBeGreaterThan(TSUGITASHI_MAX_TARGET);
  });
});
