/**
 * The sound sets Tsugitashi can play. A tone is a counter "riser" that runs while the shared
 * counter climbs, a "bust" that fires when someone goes over, and a short "preview" for the menu.
 * They take the context and output as arguments so they can be rendered offline as well as live.
 */
import { createNoiseSource } from "../../shared/audio/context";

export type ToneId = "classic" | "dojo";

/** How long the riser takes to reach its top pitch/speed: about the counter's climb to the highest target. */
export const RISER_SECONDS = 10;

export interface Tone {
  id: ToneId;
  label: string;
  /** Starts the counter sound; the returned function fades it out. */
  riser: (c: BaseAudioContext, out: AudioNode) => () => void;
  bust: (c: BaseAudioContext, out: AudioNode) => void;
  preview: (c: BaseAudioContext, out: AudioNode) => void;
}

/* ------------------------------------------------------------------ classic */

const CLASSIC_START_HZ = 110;
/** Kept low (and soft-edged) so long rounds don't hurt to listen to. */
const CLASSIC_TOP_HZ = 520;
const CLASSIC_GAIN = 0.12;

function classicRiser(c: BaseAudioContext, out: AudioNode) {
  const t = c.currentTime;
  // A triangle wave through a low-pass filter: no harsh upper harmonics, even at the top.
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(CLASSIC_START_HZ, t);
  osc.frequency.exponentialRampToValueAtTime(CLASSIC_TOP_HZ, t + RISER_SECONDS);
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.setTargetAtTime(CLASSIC_GAIN, t, 0.01);
  osc.connect(filter).connect(gain).connect(out);
  osc.start(t);
  return () => {
    const now = c.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0, now, 0.015);
    osc.stop(now + 0.1);
  };
}

/** A low thump plus a burst of filtered noise. */
function classicBust(c: BaseAudioContext, out: AudioNode) {
  const t = c.currentTime;
  const thump = c.createOscillator();
  thump.type = "sine";
  thump.frequency.setValueAtTime(120, t);
  thump.frequency.exponentialRampToValueAtTime(30, t + 0.6);
  const thumpGain = c.createGain();
  thumpGain.gain.setValueAtTime(0.9, t);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  thump.connect(thumpGain).connect(out);
  thump.start(t);
  thump.stop(t + 0.75);

  const noise = createNoiseSource(c);
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2500, t);
  filter.frequency.exponentialRampToValueAtTime(120, t + 1.3);
  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.7, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
  noise.connect(filter).connect(noiseGain).connect(out);
  noise.start(t);
  noise.stop(t + 1.45);
}

function classicPreview(c: BaseAudioContext, out: AudioNode) {
  const t = c.currentTime;
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.exponentialRampToValueAtTime(440, t + 0.35);
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.2, t + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + 0.5);
}

/* --------------------------------------------------------------------- dojo */

/** Seconds between taiko hits at the start, and how much faster they get by the top of the climb. */
const BEAT_START_S = 0.8;
const BEAT_END_S = 0.2;
/** Every Nth hit is an accent (a deeper, louder drum). */
const ACCENT_EVERY = 4;

/** Gap before the next taiko hit, `elapsed` seconds into the climb. The pulse speeds up like a heartbeat. */
export function beatInterval(elapsed: number): number {
  const k = Math.min(1, Math.max(0, elapsed / RISER_SECONDS));
  return BEAT_START_S * Math.pow(BEAT_END_S / BEAT_START_S, k);
}

/** Hirajoshi (the classic "Japanese" scale), as semitones above the root, climbing two octaves. */
const SCALE_STEPS = [0, 2, 3, 7, 8, 12, 14, 15, 19, 20, 24] as const;
const ROOT_HZ = 146.83; // D3
const stepHz = (semis: number) => ROOT_HZ * Math.pow(2, semis / 12);

/** One taiko hit: a pitched-down skin thump with a short slap of noise on top. */
function taiko(c: BaseAudioContext, out: AudioNode, t: number, level: number, deep = false) {
  const body = c.createOscillator();
  body.type = "sine";
  body.frequency.setValueAtTime(deep ? 150 : 190, t);
  body.frequency.exponentialRampToValueAtTime(deep ? 48 : 62, t + 0.14);
  const bodyGain = c.createGain();
  bodyGain.gain.setValueAtTime(0.0001, t);
  bodyGain.gain.exponentialRampToValueAtTime(level, t + 0.004);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + (deep ? 0.4 : 0.26));
  body.connect(bodyGain).connect(out);
  body.start(t);
  body.stop(t + 0.45);

  const slap = createNoiseSource(c);
  const band = c.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1900;
  band.Q.value = 0.9;
  const slapGain = c.createGain();
  slapGain.gain.setValueAtTime(level * 0.45, t);
  slapGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  slap.connect(band).connect(slapGain).connect(out);
  slap.start(t);
  slap.stop(t + 0.07);
}

/**
 * The dojo riser: an accelerating taiko pulse under a breathy flute that climbs the scale.
 * `pump(until)` schedules the drum hits that fall before `until` (context time); the live wrapper
 * calls it on a timer, and an offline render can call it once for the whole clip.
 */
export function createDojoRiser(c: BaseAudioContext, out: AudioNode) {
  const t0 = c.currentTime;

  // Flute: a sine with a touch of triangle, a little vibrato and some breath noise.
  const bus = c.createGain();
  bus.gain.setValueAtTime(0, t0);
  bus.gain.setTargetAtTime(0.07, t0, 0.25);
  bus.connect(out);

  const tone = c.createOscillator();
  tone.type = "sine";
  const edge = c.createOscillator();
  edge.type = "triangle";
  const edgeGain = c.createGain();
  edgeGain.gain.value = 0.25;
  const vibrato = c.createOscillator();
  vibrato.frequency.value = 5.2;
  const vibratoDepth = c.createGain();
  vibratoDepth.gain.value = 5;
  vibrato.connect(vibratoDepth);
  vibratoDepth.connect(tone.frequency);
  vibratoDepth.connect(edge.frequency);
  tone.connect(bus);
  edge.connect(edgeGain).connect(bus);

  const breath = createNoiseSource(c);
  breath.loop = true;
  const breathBand = c.createBiquadFilter();
  breathBand.type = "bandpass";
  breathBand.Q.value = 2.5;
  const breathGain = c.createGain();
  breathGain.gain.value = 0.35;
  breath.connect(breathBand).connect(breathGain).connect(bus);

  // Step up the scale across the climb, gliding slightly into each note.
  const noteSeconds = RISER_SECONDS / SCALE_STEPS.length;
  SCALE_STEPS.forEach((semis, i) => {
    const at = t0 + i * noteSeconds;
    const hz = stepHz(semis);
    for (const p of [tone.frequency, edge.frequency]) {
      if (i === 0) p.setValueAtTime(hz, at);
      else p.setTargetAtTime(hz, at, 0.05);
    }
    if (i === 0) breathBand.frequency.setValueAtTime(hz * 2, at);
    else breathBand.frequency.setTargetAtTime(hz * 2, at, 0.05);
  });
  for (const node of [tone, edge, vibrato, breath]) node.start(t0);

  // Drums.
  let nextHit = t0;
  let hitCount = 0;
  const pump = (until: number) => {
    while (nextHit < until) {
      const accent = hitCount % ACCENT_EVERY === 0;
      taiko(c, out, nextHit, accent ? 0.55 : 0.32, accent);
      nextHit += beatInterval(nextHit - t0);
      hitCount++;
    }
  };

  const stop = () => {
    const now = c.currentTime;
    bus.gain.cancelScheduledValues(now);
    bus.gain.setTargetAtTime(0, now, 0.03);
    for (const node of [tone, edge, vibrato, breath]) node.stop(now + 0.2);
  };
  return { pump, stop };
}

const PUMP_EVERY_MS = 40;
const LOOKAHEAD_S = 0.25;

function dojoRiser(c: BaseAudioContext, out: AudioNode) {
  const riser = createDojoRiser(c, out);
  riser.pump(c.currentTime + LOOKAHEAD_S);
  const timer = setInterval(() => riser.pump(c.currentTime + LOOKAHEAD_S), PUMP_EVERY_MS);
  return () => {
    clearInterval(timer);
    riser.stop();
  };
}

/** An ōdaiko boom, a crack of noise and a gong that rings out. */
function dojoBust(c: BaseAudioContext, out: AudioNode) {
  const t = c.currentTime;
  taiko(c, out, t, 0.55, true);

  const boom = c.createOscillator();
  boom.type = "sine";
  boom.frequency.setValueAtTime(95, t);
  boom.frequency.exponentialRampToValueAtTime(36, t + 0.9);
  const boomGain = c.createGain();
  boomGain.gain.setValueAtTime(0.6, t);
  boomGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
  boom.connect(boomGain).connect(out);
  boom.start(t);
  boom.stop(t + 1.25);

  const crack = createNoiseSource(c);
  const crackFilter = c.createBiquadFilter();
  crackFilter.type = "lowpass";
  crackFilter.frequency.setValueAtTime(3200, t);
  crackFilter.frequency.exponentialRampToValueAtTime(180, t + 0.5);
  const crackGain = c.createGain();
  crackGain.gain.setValueAtTime(0.4, t);
  crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
  crack.connect(crackFilter).connect(crackGain).connect(out);
  crack.start(t);
  crack.stop(t + 0.6);

  // Gong: inharmonic partials, each fading at its own rate.
  const GONG_HZ = 190;
  [1, 1.47, 2.09, 2.56, 3.19].forEach((ratio, i) => {
    const partial = c.createOscillator();
    partial.type = "sine";
    partial.frequency.value = GONG_HZ * ratio;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.11 / (i + 1), t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6 - i * 0.3);
    partial.connect(g).connect(out);
    partial.start(t + 0.03);
    partial.stop(t + 2.7);
  });
}

function dojoPreview(c: BaseAudioContext, out: AudioNode) {
  const t = c.currentTime;
  taiko(c, out, t, 0.75, true);
  taiko(c, out, t + 0.28, 0.45);
  taiko(c, out, t + 0.5, 0.45);
  const note = c.createOscillator();
  note.type = "sine";
  note.frequency.setValueAtTime(stepHz(12), t + 0.5);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t + 0.5);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.6);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
  note.connect(g).connect(out);
  note.start(t + 0.5);
  note.stop(t + 1.35);
}

export const TONES: Record<ToneId, Tone> = {
  classic: {
    id: "classic",
    label: "Classic",
    riser: classicRiser,
    bust: classicBust,
    preview: classicPreview,
  },
  dojo: { id: "dojo", label: "Dojo", riser: dojoRiser, bust: dojoBust, preview: dojoPreview },
};

export const TONE_IDS = Object.keys(TONES) as ToneId[];
