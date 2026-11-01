/* WebAudio sounds for Tsugitashi: one rising tone for the shared counter, and a bomb for busts. */

/** The tone climbs from here... */
const RISER_START_HZ = 110;
/** ...to here, and stays. Kept low (and soft-edged) so long rounds don't hurt to listen to. */
const RISER_TOP_HZ = 520;
/** Seconds to reach the top pitch: about as long as the counter takes to reach the highest target. */
const RISER_SECONDS = 10;
const RISER_GAIN = 0.12;

let ctx: AudioContext | null = null;
let riser: { osc: OscillatorNode; gain: GainNode } | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Starts the counter tone. Its pitch tracks the counter's climb. */
export function startRiser() {
  const c = audio();
  if (!c || riser) return;
  const t = c.currentTime;
  // A triangle wave through a low-pass filter: no harsh upper harmonics, even at the top.
  const osc = c.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(RISER_START_HZ, t);
  osc.frequency.exponentialRampToValueAtTime(RISER_TOP_HZ, t + RISER_SECONDS);
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.setTargetAtTime(RISER_GAIN, t, 0.01);
  osc.connect(filter).connect(gain).connect(c.destination);
  osc.start(t);
  riser = { osc, gain };
}

export function stopRiser() {
  if (!riser || !ctx) return;
  const { osc, gain } = riser;
  const t = ctx.currentTime;
  gain.gain.cancelScheduledValues(t);
  gain.gain.setTargetAtTime(0, t, 0.015);
  osc.stop(t + 0.1);
  riser = null;
}

/** A low thump plus a burst of filtered noise. */
export function bomb() {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;

  const thump = c.createOscillator();
  thump.type = "sine";
  thump.frequency.setValueAtTime(120, t);
  thump.frequency.exponentialRampToValueAtTime(30, t + 0.6);
  const thumpGain = c.createGain();
  thumpGain.gain.setValueAtTime(0.9, t);
  thumpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  thump.connect(thumpGain).connect(c.destination);
  thump.start(t);
  thump.stop(t + 0.75);

  const length = Math.floor(c.sampleRate * 1.4);
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(2500, t);
  filter.frequency.exponentialRampToValueAtTime(120, t + 1.3);
  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(0.7, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);
  noise.connect(filter).connect(noiseGain).connect(c.destination);
  noise.start(t);
}

/** Creates/resumes the audio context; call from a user gesture so later sounds can play. */
export function unlockAudio() {
  audio();
}
