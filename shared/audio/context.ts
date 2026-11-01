/**
 * The app's one AudioContext. Every mode's sounds route through the master gain, so
 * mute works everywhere, and share one white-noise buffer instead of building their own.
 */

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuffer: AudioBuffer | null = null;
let muted = false;
const listeners = new Set<() => void>();

function createContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  const Ctor = w.AudioContext ?? w.webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

/** The shared context, created on first use and resumed if the browser suspended it. */
export function getAudioContext(): AudioContext | null {
  if (!ctx) {
    ctx = createContext();
    if (ctx) {
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
    }
  }
  if (ctx?.state === "suspended") void ctx.resume();
  return ctx;
}

/** Connect sounds here, never straight to `destination`. */
export function getMasterGain(): GainNode | null {
  getAudioContext();
  return master;
}

/** Creates/resumes the context; call from a user gesture so later sounds can play (Safari). */
export function unlockAudio() {
  getAudioContext();
}

/** A fresh source playing a shared 1.5 s burst of white noise. */
export function createNoiseSource(c: BaseAudioContext): AudioBufferSourceNode {
  if (!noiseBuffer || noiseBuffer.sampleRate !== c.sampleRate) {
    noiseBuffer = c.createBuffer(1, Math.floor(c.sampleRate * 1.5), c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const source = c.createBufferSource();
  source.buffer = noiseBuffer;
  return source;
}

export const isMuted = () => muted;

export function setMuted(next: boolean) {
  if (next === muted) return;
  muted = next;
  if (master) master.gain.value = next ? 0 : 1;
  listeners.forEach((listener) => listener());
}

export const toggleMuted = () => setMuted(!muted);

export function subscribeMuted(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
