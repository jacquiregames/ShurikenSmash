import { getModeImageUrl } from "../../shared/config/assets";
import type { ModeMeta } from "../../shared/game/mode";
import { BLIND_ROUND_MS } from "./config";

export const blindMeta: ModeMeta = {
  id: "blind",
  title: "SHADOW STRIKE",
  menuLabel: "Shadow Strike (Blind 10s)",
  menuIcon: getModeImageUrl("blind", "icon"),
  logoImage: getModeImageUrl("blind", "logo"),
  rulesImage: getModeImageUrl("blind", "rules"),
  roundMs: BLIND_ROUND_MS,
  usesOutcomeMedia: false,
};
