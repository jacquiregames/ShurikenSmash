import { getModeImageUrl } from "../../shared/config/assets";
import type { ModeMeta } from "../../shared/game/mode";

/** The gauntlet plays the other modes in turn, so it has no round length or media of its own. */
export const gauntletMeta: ModeMeta = {
  id: "gauntlet",
  title: "NINJA GAUNTLET",
  menuLabel: "Ninja Gauntlet (All 5)",
  logoImage: getModeImageUrl("gauntlet", "logo"),
  rulesImage: getModeImageUrl("gauntlet", "rules"),
  usesOutcomeMedia: false,
};
