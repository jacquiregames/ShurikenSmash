import { getModeImageUrl } from "../../shared/config/assets";
import type { ModeMeta } from "../../shared/game/mode";

export const stackMeta: ModeMeta = {
  id: "stack",
  title: "SHINOBI STACK",
  menuLabel: "Shinobi Stack (Climb)",
  menuIcon: getModeImageUrl("stack", "icon"),
  logoImage: getModeImageUrl("stack", "logo"),
  rulesImage: getModeImageUrl("stack", "rules"),
  roundMs: 30_000,
  /** Stack shows its own end screen so players can study their towers. */
  usesOutcomeMedia: false,
};
