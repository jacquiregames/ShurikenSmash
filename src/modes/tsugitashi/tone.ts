import { useSyncExternalStore } from "react";
import { TONE_IDS, type ToneId } from "./tones";

/** The player's chosen Tsugitashi sound set, remembered between visits. */
const STORAGE_KEY = "ninja-dojo:tsugitashi-tone";
const DEFAULT_TONE: ToneId = "classic";

const isToneId = (v: unknown): v is ToneId => TONE_IDS.includes(v as ToneId);

function load(): ToneId {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isToneId(saved) ? saved : DEFAULT_TONE;
  } catch {
    return DEFAULT_TONE; // storage can be blocked (private windows, embedded frames)
  }
}

let current: ToneId = load();
const listeners = new Set<() => void>();

export const getTone = () => current;

export function setTone(next: ToneId) {
  if (next === current) return;
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Not remembered, but still applies for this visit.
  }
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useTone = () => useSyncExternalStore(subscribe, getTone, () => DEFAULT_TONE);
