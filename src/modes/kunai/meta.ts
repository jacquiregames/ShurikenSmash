import { getModeImageUrl } from "../../shared/config/assets";
import type { ModeMeta } from "../../shared/game/mode";

/** Kunai Bullseye runs its own rounds, countdown and results, so it has no `roundMs`. */
export const kunaiMeta: ModeMeta = {
  id: "kunai",
  title: "KUNAI BULLSAI",
  menuLabel: "Kunai Bullsai (Aim)",
  menuIcon: getModeImageUrl("kunai", "icon"),
  logoImage: getModeImageUrl("kunai", "logo"),
  rulesImage: getModeImageUrl("kunai", "rules"),
  usesOutcomeMedia: false,
};
