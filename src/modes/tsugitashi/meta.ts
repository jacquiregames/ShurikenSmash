import type { ModeMeta } from "../../shared/game/mode";
import { TSUGITASHI_ROUND_MS } from "./config";
import { getModeImageUrl } from "../../shared/config/assets";

export const tsugitashiMeta: ModeMeta = {
  id: "tsugitashi",
  title: "TSUGITASHI",
  menuLabel: "Tsugitashi (Don't Go Over)",
  menuIcon: getModeImageUrl("tsugitashi", "icon"),
  logoImage: getModeImageUrl("tsugitashi", "logo"),
  rulesImage: getModeImageUrl("tsugitashi", "rules"),
  roundMs: TSUGITASHI_ROUND_MS,
  usesOutcomeMedia: true,
};
