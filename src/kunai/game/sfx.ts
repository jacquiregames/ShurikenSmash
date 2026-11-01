/* WebAudio synthesizer for Kunai Bullseye — 100% procedural, no external audio assets needed */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let muted = false;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function unlock() {
  ac();
}

export function setMuted(m: boolean) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.55;
}

export function isMuted() {
  return muted;
}

function noise(c: AudioContext) {
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 1.5, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  return s;
}

function env(node: AudioNode, t: number, a: number, dur: number, peak: number) {
  const g = ctx!.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  node.connect(g);
  g.connect(master!);
  return g;
}

function tone(
  type: OscillatorType,
  f0: number,
  f1: number,
  dur: number,
  peak: number,
  delay = 0,
) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(o, t, 0.006, dur, peak);
  o.start(t);
  o.stop(t + dur + 0.06);
}

function burst(dur: number, peak: number, f0: number, f1: number, delay = 0, q = 1) {
  const c = ac();
  if (!c || muted) return;
  const t = c.currentTime + delay;
  const s = noise(c);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = q;
  bp.frequency.setValueAtTime(f0, t);
  bp.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  s.connect(bp);
  env(bp, t, 0.005, dur, peak);
  s.start(t);
  s.stop(t + dur + 0.06);
}

/** Marker locked: snappy wooden clamp + katana unsheathe chime */
export function lock() {
  tone("square", 1320, 680, 0.05, 0.2);
  tone("triangle", 1880, 1100, 0.08, 0.15);
  burst(0.06, 0.18, 3800, 1200, 0, 2.5);
}

/** Kunai thrown: whoosh of cutting wind with metallic blade whistle */
export function throwSfx() {
  burst(0.32, 0.28, 480, 3800, 0, 1.1);
  tone("sawtooth", 280, 1150, 0.28, 0.07);
  tone("sine", 600, 1200, 0.22, 0.04);
}

/** Kunai impact into wood/straw: solid thud + vibrating twang oscillation */
export function hit(points: number, bull: boolean) {
  if (bull) {
    gong();
    return;
  }
  const c = ac();
  if (!c || muted) return;

  // Solid wood thud
  const thudPitch = Math.max(65, 140 - points * 0.5);
  tone("sine", thudPitch, 38, 0.28, 0.48);
  burst(0.18, 0.32, 1200, 140, 0, 1.2);

  // Metal resonance / blade twang
  tone("triangle", 440 + points * 3.5, 220, 0.35, 0.14, 0.01);
  tone("sine", 880 + points * 4, 340, 0.22, 0.08, 0.02);

  // Subtle spring twang modulation
  try {
    const t = c.currentTime + 0.02;
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(320 + points * 2, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.3);
    const g = env(osc, t, 0.01, 0.32, 0.08);
    // Vibrato
    const lfo = c.createOscillator();
    lfo.frequency.value = 24;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 18;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + 0.35);
    osc.start(t);
    osc.stop(t + 0.35);
    g.gain.setValueAtTime(0.08, t);
  } catch {
    // fallback if advanced graph fails
  }
}

/** Bullseye: Majestic Japanese temple gong (Daisō) with golden shimmer */
export function gong() {
  const c = ac();
  if (!c || muted) return;

  // Heavy fundamental and deep sub
  tone("sine", 130, 126, 2.8, 0.6);
  tone("sine", 196, 192, 2.4, 0.45);
  tone("sine", 294, 288, 2.1, 0.35);
  tone("triangle", 392, 384, 1.8, 0.25);
  tone("triangle", 588, 574, 1.5, 0.18, 0.01);
  tone("sine", 880, 860, 1.2, 0.12, 0.02);
  
  // Strike impact burst + high shimmer
  burst(0.65, 0.28, 3200, 420, 0, 0.85);
  burst(0.4, 0.15, 6000, 2200, 0.02, 1.8);
}

/** Countdown: Authentic Taiko drum strikes (ドン、ドン、ドン、カッ！) */
export function count(n: number) {
  if (n === 0) {
    // GO! (カッ - sharp wooden bachi rimshot)
    burst(0.18, 0.42, 2800, 600, 0, 2.2);
    tone("square", 840, 420, 0.22, 0.28);
    tone("triangle", 1120, 560, 0.2, 0.18);
  } else {
    // 3, 2, 1 (ドン - deep Taiko drum beat)
    const base = 85 + (3 - n) * 12;
    tone("sine", base * 1.8, base * 0.6, 0.38, 0.55);
    tone("triangle", base * 2.4, base * 0.8, 0.28, 0.32);
    burst(0.14, 0.35, 850, 120, 0, 1.4);
  }
}

/** Fuse tension tick under urgency */
export function fuseTick() {
  tone("square", 1680, 1280, 0.04, 0.12);
  burst(0.03, 0.08, 4200, 2400, 0, 3);
}

/** Round clear fanfare */
export function roundUp() {
  const notes = [392, 494, 587, 784];
  notes.forEach((f, i) => {
    tone("triangle", f, f * 1.01, 0.32, 0.18, i * 0.08);
    tone("sine", f / 2, f / 2, 0.35, 0.12, i * 0.08);
  });
}

/** Match victory fanfare */
export function victory() {
  const notes = [330, 392, 494, 587, 659, 784, 988, 1175];
  notes.forEach((f, i) => {
    tone("triangle", f, f, 0.45, 0.22, i * 0.1);
    tone("sine", f / 2, f / 2, 0.55, 0.14, i * 0.1);
  });
  setTimeout(() => gong(), 750);
}

/** UI click / button press */
export function ui() {
  tone("sine", 880, 440, 0.06, 0.12);
  tone("triangle", 1200, 600, 0.04, 0.08);
}
