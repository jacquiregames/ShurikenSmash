import {
  BAR_CM,
  BULLSEYE_D,
  FLIGHT_MS,
  ROUNDS,
  ROUND_TIME,
  SPEED,
  scoreFor,
  zoneFor,
  type KunaiPlayer,
  type ZoneKey,
} from "./config";
import * as realSfx from "./sfx";

/**
 * The Kunai Bullseye match as a plain state machine (no React in here).
 *
 *   title ──start──▶ countdown ──▶ live ──(everyone landed / fuse out)──▶ roundEnd
 *                       ▲                                                    │
 *                       └──────────── next round (rounds < ROUNDS) ◀─────────┤
 *                                                                            ▼
 *                                                                        gameOver
 *
 * React reads `getSnapshot()` through `useSyncExternalStore`. The marker positions and the
 * fuse are written straight to the DOM from `step()`, keeping 60fps motion off the render path.
 */

export type KunaiPhase = "title" | "countdown" | "live" | "roundEnd" | "gameOver";
export type PStatus = "waiting" | "aiming" | "flying" | "landed";

export interface Run {
  status: PStatus;
  pos: number;
  cm: number;
  points: number;
  zone: ZoneKey;
  bull: boolean;
  auto: boolean;
  throwId: number;
}

export interface BannerRow {
  i: number;
  cm: number;
  pts: number;
}

export interface Banner {
  title: string;
  gold?: boolean;
  rows?: BannerRow[];
}

/** What React renders from. Replaced (never mutated) on every change. */
export interface EngineState {
  phase: KunaiPhase;
  round: number;
  count: number;
  runs: Run[];
  history: number[][];
  totals: number[];
  winners: number[] | null;
  banner: Banner | null;
}

type Sfx = Pick<
  typeof realSfx,
  "count" | "throwSfx" | "lock" | "hit" | "fuseTick" | "roundUp" | "victory" | "unlock"
>;

export interface EngineOptions {
  /** Source of randomness for the markers' starting positions. */
  random?: () => number;
  sfx?: Sfx;
}

interface DomRef<T> {
  current: T | null;
}

export interface Engine {
  getSnapshot: () => EngineState;
  subscribe: (listener: () => void) => () => void;
  /** Starts a fresh match from round 1. */
  start: () => void;
  /** A player pressed their throw key (or pad). */
  press: (seat: number) => void;
  /** Advances marker motion and the fuse by `dt` seconds. The frame loop calls this. */
  step: (dt: number) => void;
  /** Starts the frame loop; returns the function that stops it and clears pending timers. */
  mount: () => () => void;
  setMarkerEl: (seat: number, el: HTMLElement | null) => void;
  fuseRef: DomRef<HTMLDivElement>;
  fuseFillRef: DomRef<HTMLDivElement>;
  fuseValRef: DomRef<HTMLSpanElement>;
}

const freshRun = (): Run => ({
  status: "waiting",
  pos: 0,
  cm: 0,
  points: 0,
  zone: "off",
  bull: false,
  auto: false,
  throwId: 0,
});

const freshRuns = (n: number): Run[] => Array.from({ length: n }, freshRun);
const seats = <T>(n: number, value: T): T[] => Array.from({ length: n }, () => value);

/** Seconds after "3" at which each count beat plays, and when the round goes live. */
const COUNT_BEATS_MS = [700, 1400, 2100] as const;
const GO_LIVE_MS = 2560;
/** Pause after the last kunai lands before the round is scored. */
const LAST_LAND_MS = 1000;
const ROUND_BANNER_MS = 2900;
const MATCH_BANNER_MS = 2600;
const BULLSEYE_BANNER_MS = 2300;

export function createEngine(
  players: readonly KunaiPlayer[],
  { random = Math.random, sfx = realSfx }: EngineOptions = {},
): Engine {
  const N = players.length;

  let state: EngineState = {
    phase: "title",
    round: 1,
    count: 3,
    runs: freshRuns(N),
    history: [],
    totals: seats(N, 0),
    winners: null,
    banner: null,
  };
  const listeners = new Set<() => void>();
  const set = (patch: Partial<EngineState>) => {
    state = { ...state, ...patch };
    listeners.forEach((l) => l());
  };

  /* Mutable per-frame data that React never reads. */
  const pos: number[] = seats(N, 0);
  const dir: number[] = Array.from({ length: N }, (_, i) => (i % 2 === 0 ? 1 : -1));
  let locked = seats(N, false);
  let landed = seats(N, false);
  let endScheduled = false;
  let fuseLeft = 0;
  let lastSec = 99;
  let throwSeq = 0;
  let timers: ReturnType<typeof setTimeout>[] = [];

  const markerEls: (HTMLElement | null)[] = Array.from({ length: N }, () => null);
  const fuseRef: DomRef<HTMLDivElement> = { current: null };
  const fuseFillRef: DomRef<HTMLDivElement> = { current: null };
  const fuseValRef: DomRef<HTMLSpanElement> = { current: null };

  const after = (ms: number, fn: () => void) => {
    timers.push(setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  };

  const paint = () => {
    for (let i = 0; i < N; i++) markerEls[i]?.style.setProperty("--pos", pos[i].toFixed(4));
  };

  const setMarkerEl = (seat: number, el: HTMLElement | null) => {
    markerEls[seat] = el;
    el?.style.setProperty("--pos", pos[seat].toFixed(4));
  };

  const updateRun = (seat: number, patch: Partial<Run>) =>
    state.runs.map((r, idx) => (idx === seat ? { ...r, ...patch } : r));

  /* ---------------- phase transitions ---------------- */

  function beginCountdown(round: number) {
    clearTimers();
    endScheduled = false;
    locked = seats(N, false);
    landed = seats(N, false);
    for (let i = 0; i < N; i++) {
      pos[i] = (random() * 1.5 - 0.75) * (i % 2 === 0 ? 1 : 0.86);
      dir[i] = i % 2 === 0 ? 1 : -1;
    }
    paint();
    set({
      phase: "countdown",
      round,
      count: 3,
      runs: freshRuns(N),
      banner: null,
      winners: null,
    });

    sfx.count(3);
    COUNT_BEATS_MS.forEach((ms, k) => {
      const n = 2 - k;
      after(ms, () => {
        set({ count: n });
        sfx.count(n);
      });
    });
    after(GO_LIVE_MS, beginLive);
  }

  function beginLive() {
    set({
      phase: "live",
      count: 0,
      runs: state.runs.map((r) => ({ ...r, status: "aiming" as const })),
    });
    fuseLeft = ROUND_TIME[state.round - 1];
    lastSec = 99;
  }

  function endRound() {
    if (endScheduled) return;
    endScheduled = true;

    const hist = [...state.history, state.runs.map((r) => r.points)];
    const totals = players.map((_, i) => hist.reduce((s, r) => s + (r[i] ?? 0), 0));
    const rows: BannerRow[] = state.runs.map((r, i) => ({ i, cm: r.cm, pts: r.points }));
    const rn = state.round;

    const isLast = rn >= ROUNDS;
    if (!isLast) sfx.roundUp();
    set({
      phase: "roundEnd",
      history: hist,
      totals,
      banner: { title: isLast ? "MATCH OVER" : `ROUND ${rn} COMPLETE`, rows },
    });

    if (isLast) {
      const max = Math.max(...totals);
      const who = totals.flatMap((t, i) => (t === max ? [i] : []));
      after(MATCH_BANNER_MS, () => finish(who));
    } else {
      after(ROUND_BANNER_MS, () => beginCountdown(rn + 1));
    }
  }

  function finish(winners: number[]) {
    set({ phase: "gameOver", banner: null, winners });
    sfx.victory();
  }

  /* ---------------- throwing ---------------- */

  function lock(seat: number, auto: boolean) {
    if (locked[seat]) return;
    locked[seat] = true;

    const p = pos[seat];
    const d = Math.abs(p);
    const cm = d * BAR_CM;
    const points = scoreFor(d);
    const zone = zoneFor(d);
    const bull = d <= BULLSEYE_D;
    const throwId = ++throwSeq;

    paint();
    sfx.throwSfx();
    if (!auto) sfx.lock();
    set({
      runs: updateRun(seat, { status: "flying", pos: p, cm, points, zone, bull, auto, throwId }),
    });

    after(FLIGHT_MS, () => {
      landed[seat] = true;
      set({
        runs: updateRun(seat, { status: "landed" }),
      });
      sfx.hit(points, bull);

      if (bull) {
        set({ banner: { title: "BULLSEYE", gold: true } });
        after(BULLSEYE_BANNER_MS, () => {
          if (state.banner?.title === "BULLSEYE") set({ banner: null });
        });
      }

      if (state.phase === "live" && landed.every(Boolean)) after(LAST_LAND_MS, endRound);
    });
  }

  /* ---------------- public API ---------------- */

  function press(seat: number) {
    if (state.phase !== "live" || locked[seat]) return;
    lock(seat, false);
  }

  function start() {
    sfx.unlock();
    set({ history: [], totals: seats(N, 0) });
    beginCountdown(1);
  }

  function step(dt: number) {
    const phase = state.phase;
    if (phase !== "countdown" && phase !== "live") return;

    const speed = SPEED[state.round - 1] ?? SPEED[0];
    let moving = false;
    for (let i = 0; i < N; i++) {
      if (locked[i]) continue;
      moving = true;
      let np = pos[i] + dir[i] * speed * dt;
      if (np >= 1) {
        np = 2 - np;
        dir[i] = -1;
      } else if (np <= -1) {
        np = -2 - np;
        dir[i] = 1;
      }
      pos[i] = np;
      const el = markerEls[i];
      if (el) {
        el.style.setProperty("--pos", np.toFixed(4));
        el.style.setProperty("--dir", dir[i] > 0 ? "1" : "-1");
        el.style.setProperty("--trail-o", (0.3 + Math.min(0.55, speed * 0.28)).toFixed(2));
        el.style.setProperty("--speed-scale", (0.7 + speed * 0.45).toFixed(2));
      }
    }
    if (!moving || phase !== "live") return;

    const total = ROUND_TIME[state.round - 1] ?? 10;
    fuseLeft = Math.max(0, fuseLeft - dt);
    const frac = Math.max(0, Math.min(1, fuseLeft / total));
    const danger = fuseLeft <= 3.05;
    fuseFillRef.current?.style.setProperty("--f", frac.toFixed(4));
    if (fuseValRef.current) {
      fuseValRef.current.textContent = fuseLeft.toFixed(1);
      fuseValRef.current.classList.toggle("is-danger", danger);
    }
    fuseRef.current?.classList.toggle("is-danger", danger);

    const sec = Math.ceil(fuseLeft);
    if (sec !== lastSec) {
      lastSec = sec;
      if (sec > 0 && sec <= 3) sfx.fuseTick();
    }

    if (fuseLeft <= 0) {
      for (let i = 0; i < N; i++) if (!locked[i]) lock(i, true);
    }
  }

  function mount() {
    let raf = 0;
    let last = performance.now();
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
      last = t;
      step(dt);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      clearTimers();
    };
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    start,
    press,
    step,
    mount,
    setMarkerEl,
    fuseRef,
    fuseFillRef,
    fuseValRef,
  };
}
