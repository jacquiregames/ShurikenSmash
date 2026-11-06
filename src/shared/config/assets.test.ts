import { describe, expect, it } from "vitest";
import { AVAILABLE_COLORS } from "./colors";
import * as assets from "./assets";

// Only the file names matter here, never the contents.
const onDisk = new Set(Object.keys(import.meta.glob("../../../public/**/*.*")));

const MODES = ["mash", "blind", "stack", "kunai", "tsugitashi", "gauntlet"] as const;
const OUTCOMES = ["win", "lose"] as const;
const BONUSES = ["plus100", "plus50", "plus10", "plus0"] as const;

/** Every URL the app can ask `assets.ts` for. */
function allUrls(): string[] {
  const urls = [
    assets.getMusicUrl(),
    assets.getBackdropUrl(),
    assets.getBeginButtonUrl(),
    assets.getContinueButtonUrl(),
    assets.getKunaiTargetUrl(),
    assets.getGauntletCrownUrl(),
    assets.getGauntletTotalUrl(),
    ...[3, 4].flatMap((n) => [
      assets.getPlayerCountImageUrl(n as 3 | 4),
      assets.getRewardImageUrl(n as 3 | 4),
    ]),
    ...[1, 2, 3].map(assets.getCountdownImageUrl),
    ...[1, 2, 3, 4, 5].map(assets.getGauntletCountdownImageUrl),
    ...[1, 2, 3].map(assets.getStackRowImageUrl),
    ...[1, 2, 3, 4, null].map(assets.getRankImageUrl),
    ...BONUSES.map(assets.getBonusImageUrl),
    ...MODES.flatMap((m) => [
      assets.getModeImageUrl(m, "logo"),
      assets.getModeImageUrl(m, "rules"),
    ]),
    ...MODES.filter((m) => m !== "gauntlet").map((m) => assets.getModeImageUrl(m, "icon")),
  ];
  for (const color of AVAILABLE_COLORS) {
    urls.push(assets.getColorImageUrl(color), assets.getKunaiColorImageUrl(color));
    for (const outcome of OUTCOMES) {
      urls.push(
        assets.getOutcomeImageUrl(color, outcome),
        assets.getOutcomeVideoUrl(color, outcome),
      );
    }
    for (const suffix of ["", "-hit", "-win", "-lose"]) {
      urls.push(assets.getBlindImageUrl(`${color}${suffix}`));
    }
    for (const suffix of ["", "-win"]) urls.push(assets.getBlindVideoUrl(`${color}${suffix}`));
  }
  return urls;
}

describe("asset paths", () => {
  it.skipIf(onDisk.size === 0)("every URL in assets.ts points at a file in public/", () => {
    const base = import.meta.env.BASE_URL;
    const missing = allUrls()
      .map((url) => url.slice(base.length))
      .filter((path) => !onDisk.has(`../../../public/${path}`));
    expect(missing).toEqual([]);
  });

  it("builds every URL under the app's base path", () => {
    for (const url of allUrls()) expect(url.startsWith(import.meta.env.BASE_URL)).toBe(true);
  });
});
