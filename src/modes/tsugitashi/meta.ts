import type { ModeMeta } from "../../shared/game/mode";
import { TSUGITASHI_ROUND_MS } from "./config";
import { getImageUrl } from "../../shared/config/assets";

export const tsugitashiMeta: ModeMeta = {
  id: "tsugitashi",
  title: "TSUGITASHI",
  menuLabel: "➕ Tsugitashi (Don't Go Over)",
  logoImage: getImageUrl("tsugitashi"),
  rulesImage: getImageUrl("tsugitashi-rules"),
  roundMs: TSUGITASHI_ROUND_MS,
  usesOutcomeMedia: true,
};