import { getImageUrl } from "../../shared/config/assets";
import type { ModeMeta } from "../../shared/game/mode";

export const mashMeta: ModeMeta = {
  id: "mash",
  title: "SHURIKEN SMASH",
  menuLabel: "⚔ Shuriken Smash (Mash)",
  logoImage: getImageUrl("shuriken-smash"),
  rulesImage: getImageUrl("smash-rules"),
  roundMs: 10_000,
  usesOutcomeMedia: true,
};
