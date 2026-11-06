import { getModeImageUrl } from "../../shared/config/assets";
import type { ModeMeta } from "../../shared/game/mode";

export const mashMeta: ModeMeta = {
  id: "mash",
  title: "SHURIKEN SMASH",
  menuLabel: "Shuriken Smash (Mash)",
  menuIcon: getModeImageUrl("mash", "icon"),
  logoImage: getModeImageUrl("mash", "logo"),
  rulesImage: getModeImageUrl("mash", "rules"),
  roundMs: 10_000,
  usesOutcomeMedia: true,
};
