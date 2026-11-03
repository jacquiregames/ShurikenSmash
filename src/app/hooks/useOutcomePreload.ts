import { useEffect } from "react";
import {
  getBlindImageUrl,
  getBlindVideoUrl,
  getOutcomeImageUrl,
  getOutcomeVideoUrl,
} from "../../shared/config/assets";
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
    if (!isMatchActive) return;
    const videos: HTMLVideoElement[] = [];

    if (usesOutcomeMedia(mode)) {
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
    } else if (mode === "blind") {
      for (const { colorName } of ninjas.slice(0, numPlayers)) {
        new Image().src = getBlindImageUrl(colorName);
        new Image().src = getBlindImageUrl(`${colorName}-hit`);
        new Image().src = getBlindImageUrl(`${colorName}-win`);
        new Image().src = getBlindImageUrl(`${colorName}-lose`);

        const video = document.createElement("video");
        video.preload = "auto";
        video.muted = true;
        video.src = getBlindVideoUrl(colorName);
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