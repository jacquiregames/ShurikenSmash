import { getMusicUrl } from "../config/assets";

/**
 * The background music: one looping track under every mode, with its own on/off switch
 * (separate from the sound-effects mute in context.ts). Browsers only allow audio after a
 * user gesture, so `startMusic()` is called from the first key press or click and is safe to
 * call as often as you like.
 */

const STORAGE_KEY = "ninja-dojo:music";
const VOLUME = 0.4;

let audio: HTMLAudioElement | null = null;
let enabled = readPreference();
const listeners = new Set<() => void>();

function readPreference(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true; // storage can be blocked; the music is simply on
  }
}

function writePreference(on: boolean) {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // not remembered, still works for this visit
  }
}

function track(): HTMLAudioElement | null {
  if (!audio && typeof Audio !== "undefined") {
    audio = new Audio(getMusicUrl());
    audio.loop = true;
    audio.volume = VOLUME;
    audio.preload = "auto";
  }
  return audio;
}

/** Plays the track if the music is on. Before the first gesture the browser refuses; that is fine. */
export function startMusic() {
  if (!enabled) return;
  const el = track();
  if (el?.paused) el.play().catch(() => {});
}

export const isMusicOn = () => enabled;

export function setMusicOn(next: boolean) {
  if (next === enabled) return;
  enabled = next;
  writePreference(next);
  if (next) startMusic();
  else audio?.pause();
  listeners.forEach((listener) => listener());
}

export const toggleMusic = () => setMusicOn(!enabled);

export function subscribeMusic(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
