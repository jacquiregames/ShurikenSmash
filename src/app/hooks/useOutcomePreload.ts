import { useEffect } from "react";
import {
  getBlindImageUrl,
  getBlindVideoUrl,
  getOutcomeImageUrl,
  getOutcomeVideoUrl,
} from "../../shared/config/assets";
import { preloadImages } from "../../shared/preload";
import type { GameMode, NinjaColor, Outcome } from "../../shared/game/types";
import { usesOutcomeMedia } from "../../modes/registry";
import type { GameState } from "../state";

const OUTCOMES: readonly Outcome[] = ["win", "lose"];
/** Blind's card art per state, as suffixes of the color name ("red", "red-hit", ...). */
const BLIND_IMAGE_SUFFIXES = ["", "-hit", "-win", "-lose"];
/** Blind's videos: the hit clip and the winner's clip. */
const BLIND_VIDEO_SUFFIXES = ["", "-win"];
/** A video that never reports ready must not hold up the ones behind it. */
const VIDEO_PRELOAD_TIMEOUT_MS = 4000;

/**
 * Warms the browser cache with `urls`, one video at a time. Starting dozens at once saturates
 * the connection and the media decoders, which freezes the page (the 3-2-1 countdown
 * visibly stalls). Returns the function that cancels what has not finished.
 */
function preloadVideos(urls: readonly string[]): () => void {
  const started: HTMLVideoElement[] = [];
  let cancelled = false;

  const loadFrom = (index: number) => {
    if (cancelled || index >= urls.length) return;
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    let advanced = false;
    const advance = () => {
      if (advanced) return;
      advanced = true;
      window.clearTimeout(timeout);
      loadFrom(index + 1);
    };
    const timeout = window.setTimeout(advance, VIDEO_PRELOAD_TIMEOUT_MS);
    video.addEventListener("canplaythrough", advance, { once: true });
    video.addEventListener("error", advance, { once: true });
    video.src = urls[index];
    started.push(video);
  };
  loadFrom(0);

  return () => {
    cancelled = true;
    for (const video of started) {
      video.removeAttribute("src");
      video.load();
    }
  };
}

/** Every image and video the given modes will show, for the ninjas' colors. */
function mediaFor(modes: readonly GameMode[], colors: readonly NinjaColor[]) {
  const images = new Set<string>();
  const videos = new Set<string>();
  for (const mode of modes) {
    if (usesOutcomeMedia(mode)) {
      for (const color of colors) {
        for (const outcome of OUTCOMES) {
          images.add(getOutcomeImageUrl(color, outcome));
          videos.add(getOutcomeVideoUrl(color, outcome));
        }
      }
    } else if (mode === "blind") {
      for (const color of colors) {
        for (const s of BLIND_IMAGE_SUFFIXES) images.add(getBlindImageUrl(`${color}${s}`));
        for (const s of BLIND_VIDEO_SUFFIXES) videos.add(getBlindVideoUrl(`${color}${s}`));
      }
    }
  }
  return { images: [...images], videos: [...videos] };
}

/**
 * Preloads the win/lose art and videos for the ninjas in the match. A gauntlet loads every
 * game's media once, up front. The effect is keyed on *what* to load (not on `phase`, and not
 * on which gauntlet game is current), so moving from one game to the next never cancels and
 * restarts the downloads.
 */
export function useOutcomePreload({ phase, mode, ninjas, numPlayers, gauntlet }: GameState) {
  const isMatchActive = phase !== "menu";
  const modesKey = (gauntlet?.games ?? [mode]).join(",");
  const colorsKey = ninjas
    .slice(0, numPlayers)
    .map((n) => n.colorName)
    .join(",");

  useEffect(() => {
    if (!isMatchActive) return;
    const media = mediaFor(modesKey.split(",") as GameMode[], colorsKey.split(",") as NinjaColor[]);
    preloadImages(media.images);
    return preloadVideos(media.videos);
  }, [isMatchActive, modesKey, colorsKey]);
}
