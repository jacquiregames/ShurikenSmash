import { useEffect } from "react";
import { getOutcomeImageUrl, getOutcomeVideoUrl } from "../../shared/config/assets";
import type { Outcome } from "../../shared/game/types";
import { usesOutcomeMedia } from "../../modes/registry";
import type { GameState } from "../state";

const OUTCOMES: readonly Outcome[] = ["win", "lose"];

/**
 * Preloads the win/lose art and videos for the ninjas in the match. Keyed on "is a match
 * active" (not `phase`) so downloads are not cancelled and restarted on every phase change.
 */
export function useOutcomePreload({ phase, mode, ninjas, numPlayers }: GameState) {
  const isMatchActive = phase !== "menu";
  useEffect(() => {
    if (!isMatchActive || !usesOutcomeMedia(mode)) return;
    const videos: HTMLVideoElement[] = [];

    for (const { colorName } of ninjas.slice(0, numPlayers)) {
      for (const outcome of OUTCOMES) {
        new Image().src = getOutcomeImageUrl(colorName, outcome);

        const video = document.createElement("video");
        video.preload = "auto";
        video.muted = true;
        video.src = getOutcomeVideoUrl(colorName, outcome);
        videos.push(video);
      }
    }

    return () => {
      for (const video of videos) {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [isMatchActive, mode, ninjas, numPlayers]);
}
