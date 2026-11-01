/** Plays Tsugitashi's sounds in whichever tone the player picked (see tones.ts). */
import { getAudioContext, getMasterGain } from "../../shared/audio/context";
import { getTone } from "./tone";
import { TONES } from "./tones";

let stopCurrentRiser: (() => void) | null = null;

/** Starts the counter sound. A tone chosen mid-round applies from the next one. */
export function startRiser() {
  const c = getAudioContext();
  const out = getMasterGain();
  if (!c || !out || stopCurrentRiser) return;
  stopCurrentRiser = TONES[getTone()].riser(c, out);
}

export function stopRiser() {
  stopCurrentRiser?.();
  stopCurrentRiser = null;
}

export function bomb() {
  const c = getAudioContext();
  const out = getMasterGain();
  if (c && out) TONES[getTone()].bust(c, out);
}

/** A short sample of the current tone, for the menu. */
export function previewTone() {
  const c = getAudioContext();
  const out = getMasterGain();
  if (c && out) TONES[getTone()].preview(c, out);
}
