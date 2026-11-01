import { getImageUrl } from "../../shared/config/assets";
import type { ModeMeta } from "../../shared/game/mode";

/** Kunai Bullseye runs its own rounds, countdown and results, so it has no `roundMs`. */
export const kunaiMeta: ModeMeta = {
  id: "kunai",
  title: "KUNAI BULLSAI",
  menuLabel: "🎯 Kunai Bullsai (Aim)",
  logoImage: getImageUrl("kunai-bullsai"),
  rulesImage: getImageUrl("kunai-rules"),
  usesOutcomeMedia: false,
};
