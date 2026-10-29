import { describe, expect, it } from "vitest";
import { CHART_COLUMNS, WORDS, syllable } from "./wabun";

describe("wabun table", () => {
  it("gives every kana a unique code", () => {
    const codes = CHART_COLUMNS.flat().flatMap((k) => (k ? [k.code] : []));
    expect(codes).toHaveLength(46);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("sends voiced kana as the base kana plus a mark", () => {
    expect(syllable("GU").codes).toEqual(["...-", ".."]);
    expect(syllable("PA").codes).toEqual(["-...", "..--."]);
    expect(syllable("GU").kana).toBe("グ");
  });

  it("builds every word from known kana", () => {
    for (const word of WORDS) {
      expect(word.codes.length).toBeGreaterThanOrEqual(word.syllables.length);
    }
    expect(WORDS.find((w) => w.english === "Tuna")?.codes).toEqual(["-..-", "...-", "..", ".-.-"]);
  });
});
