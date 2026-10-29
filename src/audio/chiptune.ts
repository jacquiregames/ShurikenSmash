/*
 * Tiny NES-style synth for Bakudan's music: two pulse channels, a triangle bass and a
 * noise drum channel, sequenced with a Web Audio look-ahead scheduler.
 *
 * Songs are written as space-separated "NOTE:STEPS" tokens (one step = a 16th note,
 * "-" is a rest), so a transcription can be dropped straight into BAKUDAN_SONG.
 */

type Channel = "pulse25" | "pulse50" | "triangle";

interface Track {
  channel: Channel;
  volume: number;
  notes: string;
}

interface Song {
  bpm: number;
  tracks: readonly Track[];
  /** One character per step: k = kick, s = snare, h = hat, . = nothing. */
  drums: string;
}

const bar = (s: string) => s.trim().split(/\s+/).join(" ");
const repeat = (s: string, n: number) => Array.from({ length: n }, () => s).join(" ");
/** Octave-bouncing eighth-note bass, the classic Mega Man bassline shape. */
const bounce = (root: string, octave: number) =>
  repeat(`${root}${octave}:2 ${root}${octave + 1}:2`, 4);
/** Sixteenth-note arpeggio over a chord for one bar. */
const arp = (...tones: string[]) => repeat(tones.map((t) => `${t}:1`).join(" "), 16 / tones.length);

/* An original, Mega Man–flavoured loop (8 bars, ~12.8s at 150bpm). */
export const BAKUDAN_SONG: Song = {
  bpm: 150,
  tracks: [
    {
      channel: "pulse25",
      volume: 0.16,
      notes: [
        bar("E5:2 G5:2 C6:2 G5:2 A5:3 G5:1 E5:2 D5:2"),
        bar("E5:2 G5:2 C6:2 D6:2 E6:4 D6:2 C6:2"),
        bar("A5:2 C6:2 F6:2 E6:2 D6:3 C6:1 A5:2 G5:2"),
        bar("A5:2 B5:2 C6:2 D6:2 B5:4 G5:4"),
        bar("E5:2 G5:2 C6:2 G5:2 A5:3 G5:1 E5:2 D5:2"),
        bar("E5:2 G5:2 C6:2 D6:2 E6:4 G6:2 E6:2"),
        bar("F6:2 E6:2 D6:2 C6:2 A5:2 C6:2 D6:2 F6:2"),
        bar("E6:3 D6:1 C6:2 B5:2 C6:4 -:4"),
      ].join(" "),
    },
    {
      channel: "pulse50",
      volume: 0.05,
      notes: [
        arp("C5", "E5", "G5", "E5"),
        arp("C5", "E5", "G5", "E5"),
        arp("F4", "A4", "C5", "A4"),
        arp("G4", "B4", "D5", "B4"),
        arp("C5", "E5", "G5", "E5"),
        arp("A4", "C5", "E5", "C5"),
        arp("F4", "A4", "C5", "A4"),
        arp("G4", "B4", "D5", "B4"),
      ].join(" "),
    },
    {
      channel: "triangle",
      volume: 0.3,
      notes: [
        bounce("C", 2),
        bounce("C", 2),
        bounce("F", 2),
        bounce("G", 2),
        bounce("C", 2),
        bounce("A", 2),
        bounce("F", 2),
        bounce("G", 2),
      ].join(" "),
    },
  ],
  drums: repeat("k.h.s.h.k.hks.h.", 7) + "k.h.s.h.s.s.ssss",
};

const NOTE_OFFSETS: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };

function noteToFreq(note: string): number | null {
  const m = /^([A-G])(#|b)?(\d)$/.exec(note);
  if (!m) return null;
  const semis =
    NOTE_OFFSETS[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * 2 ** (semis / 12);
}

interface NoteEvent {
  freq: number;
  steps: number;
}

/** Maps step index → note starting on that step, plus the track's total length in steps. */
function parseTrack(notes: string): { events: Map<number, NoteEvent>; length: number } {
  const events = new Map<number, NoteEvent>();
  let step = 0;
  for (const token of notes.split(/\s+/)) {
    const [note, len] = token.split(":");
    const steps = Number(len);
    const freq = noteToFreq(note);
    if (freq !== null) events.set(step, { freq, steps });
    step += steps;
  }
  return { events, length: step };
}

function pulseWave(ctx: AudioContext, duty: number): PeriodicWave {
  const harmonics = 32;
  const real = new Float32Array(harmonics);
  const imag = new Float32Array(harmonics);
  for (let n = 1; n < harmonics; n++) {
    real[n] = Math.sin(2 * Math.PI * n * duty) / (Math.PI * n);
    imag[n] = (1 - Math.cos(2 * Math.PI * n * duty)) / (Math.PI * n);
  }
  return ctx.createPeriodicWave(real, imag);
}

function noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

const LOOKAHEAD_S = 0.12;
const SCHEDULER_MS = 25;

export interface MusicPlayer {
  /** Starts the song from the top, looping until `stop`. */
  start: () => void;
  /** Cuts the music off immediately, mid-phrase. */
  stop: () => void;
  /** One-shot explosion sound effect. */
  boom: () => void;
  /** One-shot "you messed up" sound for pressing without the bomb. */
  fumble: () => void;
  /** Turns a player's Morse key tone on or off (each player has their own pitch). */
  sidetone: (playerId: number, on: boolean) => void;
  /** Tsugitashi: a tone whose pitch climbs while a player holds, tracking the accelerating count. */
  riser: (playerId: number, on: boolean) => void;
  silenceSidetones: () => void;
}

const RISER_START_HZ = 160;
const RISER_TOP_HZ = 3200;
/** Seconds for the riser to reach its top pitch: about as long as a hold takes to reach the target. */
const RISER_SECONDS = 7.5;

/** Morse sidetone pitches per player, far enough apart to tell who is keying. */
const SIDETONE_HZ = [600, 750, 900, 1050];

export function createMusicPlayer(song: Song = BAKUDAN_SONG): MusicPlayer {
  let ctx: AudioContext | null = null;
  let waves: Record<Channel, PeriodicWave | OscillatorType> | null = null;
  let noise: AudioBuffer | null = null;
  let bus: GainNode | null = null;
  let timer = 0;
  const sidetones = new Map<number, { osc: OscillatorNode; gain: GainNode }>();

  const stepSeconds = 60 / song.bpm / 4;
  const tracks = song.tracks.map((t) => ({ ...t, ...parseTrack(t.notes) }));

  const ensureContext = () => {
    if (!ctx) {
      ctx = new AudioContext();
      waves = { pulse25: pulseWave(ctx, 0.25), pulse50: pulseWave(ctx, 0.5), triangle: "triangle" as const };
      noise = noiseBuffer(ctx, 1);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  };

  const playTone = (
    out: AudioNode,
    wave: PeriodicWave | OscillatorType,
    freq: number,
    volume: number,
    at: number,
    duration: number
  ) => {
    const c = out.context;
    const osc = c.createOscillator();
    if (wave instanceof PeriodicWave) osc.setPeriodicWave(wave);
    else osc.type = wave;
    osc.frequency.setValueAtTime(freq, at);

    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(volume * 0.6, at + duration);
    gain.gain.setValueAtTime(0, at + duration);

    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + duration + 0.01);
  };

  const playNoise = (out: AudioNode, at: number, duration: number, volume: number, cutoff: number) => {
    const c = out.context;
    const src = c.createBufferSource();
    src.buffer = noise;
    const filter = c.createBiquadFilter();
    filter.type = cutoff > 4000 ? "highpass" : "lowpass";
    filter.frequency.value = cutoff;
    const gain = c.createGain();
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    src.connect(filter).connect(gain).connect(out);
    src.start(at);
    src.stop(at + duration);
  };

  const playDrum = (out: GainNode, hit: string, at: number) => {
    if (hit === "k") {
      const c = out.context;
      const osc = c.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(160, at);
      osc.frequency.exponentialRampToValueAtTime(40, at + 0.1);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.5, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.12);
      osc.connect(gain).connect(out);
      osc.start(at);
      osc.stop(at + 0.13);
    } else if (hit === "s") {
      playNoise(out, at, 0.12, 0.25, 3000);
    } else if (hit === "h") {
      playNoise(out, at, 0.03, 0.08, 8000);
    }
  };

  const scheduleStep = (out: GainNode, step: number, at: number) => {
    for (const track of tracks) {
      const event = track.events.get(step % track.length);
      if (event && waves) {
        playTone(out, waves[track.channel], event.freq, track.volume, at, event.steps * stepSeconds * 0.92);
      }
    }
    playDrum(out, song.drums[step % song.drums.length], at);
  };

  const stop = () => {
    window.clearInterval(timer);
    timer = 0;
    if (bus && ctx) {
      bus.gain.setValueAtTime(0, ctx.currentTime);
      bus.disconnect();
    }
    bus = null;
  };

  const start = () => {
    stop();
    const c = ensureContext();
    const out = c.createGain();
    out.connect(c.destination);
    bus = out;

    let step = 0;
    let nextTime = c.currentTime + 0.05;
    const pump = () => {
      while (nextTime < c.currentTime + LOOKAHEAD_S) {
        scheduleStep(out, step, nextTime);
        step++;
        nextTime += stepSeconds;
      }
    };
    pump();
    timer = window.setInterval(pump, SCHEDULER_MS);
  };

  const boom = () => {
    const c = ensureContext();
    const at = c.currentTime;
    playNoise(c.destination, at, 1.2, 0.7, 900);

    const osc = c.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(120, at);
    osc.frequency.exponentialRampToValueAtTime(30, at + 0.8);
    const gain = c.createGain();
    gain.gain.setValueAtTime(0.6, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + 0.9);
    osc.connect(gain).connect(c.destination);
    osc.start(at);
    osc.stop(at + 0.9);
  };

  /** Two falling "wah-wah" buzzes with a thud — a clumsy fail, distinct from the boom. */
  const fumble = () => {
    const c = ensureContext();
    const at = c.currentTime;
    playNoise(c.destination, at, 0.15, 0.4, 600);

    const slides = [
      { from: 520, to: 300, start: 0, length: 0.2 },
      { from: 400, to: 110, start: 0.22, length: 0.45 },
    ];
    for (const slide of slides) {
      const t = at + slide.start;
      const osc = c.createOscillator();
      if (waves?.pulse25 instanceof PeriodicWave) osc.setPeriodicWave(waves.pulse25);
      else osc.type = "square";
      osc.frequency.setValueAtTime(slide.from, t);
      osc.frequency.exponentialRampToValueAtTime(slide.to, t + slide.length);
      const gain = c.createGain();
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + slide.length);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + slide.length);
    }
  };

  const keyTone = (playerId: number, on: boolean, rising: boolean) => {
    const current = sidetones.get(playerId);
    if (!on) {
      if (!current || !ctx) return;
      // Short release ramp avoids a click when the key lifts.
      current.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.005);
      current.osc.stop(ctx.currentTime + 0.05);
      sidetones.delete(playerId);
      return;
    }
    if (current) return;
    const c = ensureContext();
    const osc = c.createOscillator();
    osc.type = "square";
    const hz = SIDETONE_HZ[playerId % SIDETONE_HZ.length];
    if (rising) {
      // Per-player offset keeps simultaneous risers distinguishable.
      const offset = hz / SIDETONE_HZ[0];
      osc.frequency.setValueAtTime(RISER_START_HZ * offset, c.currentTime);
      osc.frequency.exponentialRampToValueAtTime(RISER_TOP_HZ * offset, c.currentTime + RISER_SECONDS);
    } else {
      osc.frequency.value = hz;
    }
    const gain = c.createGain();
    gain.gain.setValueAtTime(0, c.currentTime);
    gain.gain.setTargetAtTime(0.06, c.currentTime, 0.003);
    osc.connect(gain).connect(c.destination);
    osc.start();
    sidetones.set(playerId, { osc, gain });
  };

  const sidetone = (playerId: number, on: boolean) => keyTone(playerId, on, false);
  const riser = (playerId: number, on: boolean) => keyTone(playerId, on, true);

  const silenceSidetones = () => {
    for (const id of sidetones.keys()) keyTone(id, false, false);
  };

  return { start, stop, boom, fumble, sidetone, riser, silenceSidetones };
}
