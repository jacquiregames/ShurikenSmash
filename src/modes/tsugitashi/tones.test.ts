import { describe, expect, it } from "vitest";
import { RISER_SECONDS, TONES, TONE_IDS, beatInterval } from "./tones";

describe("tones", () => {
  it("every tone id has a matching entry with all three voices", () => {
    for (const id of TONE_IDS) {
      expect(TONES[id].id).toBe(id);
      expect(typeof TONES[id].riser).toBe("function");
      expect(typeof TONES[id].bust).toBe("function");
      expect(typeof TONES[id].preview).toBe("function");
    }
  });

  it("the dojo drum pulse speeds up and then holds its top speed", () => {
    const a = beatInterval(0);
    const b = beatInterval(RISER_SECONDS / 2);
    const c = beatInterval(RISER_SECONDS);
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
    expect(beatInterval(RISER_SECONDS * 3)).toBe(c);
    expect(beatInterval(-5)).toBe(a);
  });
});
