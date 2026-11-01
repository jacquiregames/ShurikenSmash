import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  BAR_CM,
  BULLSEYE_D,
  FLIGHT_MS,
  ROUNDS,
  ROUND_TIME,
  SPEED,
  scoreFor,
  zoneFor,
  type ZoneKey,
} from "./config";
import type { KunaiPlayer } from "./config";
import * as sfx from "./sfx";

export type Phase = "title" | "countdown" | "live" | "roundEnd" | "gameOver";
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
  jp: string;
  title: string;
  sub?: string;
  gold?: boolean;
  rows?: BannerRow[];
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
const zeros = (n: number) => Array.from({ length: n }, () => 0);
const flags = (n: number) => Array.from({ length: n }, () => false);

export interface Engine {
  phase: Phase;
  round: number;
  count: number;
  runs: Run[];
  history: number[][];
  totals: number[];
  leaders: number[];
  winners: number[] | null;
  winReason: "bull" | "score" | null;
  banner: Banner | null;
  callout: { i: number; throwId: number } | null;
  shakeId: number;
  pulseId: number;
  muted: boolean;
  speedMult: number;
  fuseTotal: number;
  // dom hooks (kept off React's render path for 60fps smoothness)
  setMarkerEl: (i: number, el: HTMLElement | null) => void;
  fuseRef: RefObject<HTMLDivElement | null>;
  fuseFillRef: RefObject<HTMLDivElement | null>;
  fuseValRef: RefObject<HTMLSpanElement | null>;
  // actions
  press: (i: number) => void;
  start: () => void;
  restart: () => void;
  toTitle: () => void;
  toggleMute: () => void;
}

export function useEngine(players: readonly KunaiPlayer[]): Engine {
  const N = players.length;
  const [phase, setPhase] = useState<Phase>("title");
  const [round, setRound] = useState(1);
  const [count, setCount] = useState(3);
  const [runs, setRuns] = useState<Run[]>(() => freshRuns(N));
  const [history, setHistory] = useState<number[][]>([]);
  const [totals, setTotals] = useState<number[]>(() => zeros(N));
  const [winners, setWinners] = useState<number[] | null>(null);
  const [winReason, setWinReason] = useState<"bull" | "score" | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [callout, setCallout] = useState<{ i: number; throwId: number } | null>(null);
  const [shakeId, setShakeId] = useState(0);
  const [pulseId, setPulseId] = useState(0);
  const [muted, setMuted] = useState(false);

  /* ---- refs that mirror state so the rAF loop never reads stale values ---- */
  const phaseRef = useRef<Phase>("title");
  const roundRef = useRef(1);
  const runsRef = useRef<Run[]>(freshRuns(N));
  const historyRef = useRef<number[][]>([]);
  const posRef = useRef<number[]>([0, 0, 0, 0]);
  const dirRef = useRef<number[]>([1, -1, 1, -1]);
  const lockedRef = useRef<boolean[]>(flags(N));
  const landedRef = useRef<boolean[]>(flags(N));
  const endScheduled = useRef(false);
  const fuseLeft = useRef(0);
  const lastSec = useRef(99);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);

  const markerEls = useRef<(HTMLElement | null)[]>([null, null, null, null]);
  const fuseRef = useRef<HTMLDivElement | null>(null);
  const fuseFillRef = useRef<HTMLDivElement | null>(null);
  const fuseValRef = useRef<HTMLSpanElement | null>(null);

  const syncRuns = (next: Run[]) => {
    runsRef.current = next;
    setRuns(next);
  };

  const after = useCallback((ms: number, fn: () => void) => {
    const id = window.setTimeout(fn, ms);
    timers.current.push(id);
    return id;
  }, []);

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const paint = useCallback(() => {
    for (let i = 0; i < N; i++) {
      const el = markerEls.current[i];
      if (el) el.style.setProperty("--pos", posRef.current[i].toFixed(4));
    }
  }, [N]);

  const setMarkerEl = useCallback((i: number, el: HTMLElement | null) => {
    markerEls.current[i] = el;
    if (el) el.style.setProperty("--pos", posRef.current[i].toFixed(4));
  }, []);

  /* ---------------- round flow ---------------- */

  const beginLive = useCallback(() => {
    setCount(0);
    phaseRef.current = "live";
    setPhase("live");
    const next = runsRef.current.map((r) => ({ ...r, status: "aiming" as PStatus }));
    syncRuns(next);
    fuseLeft.current = ROUND_TIME[roundRef.current - 1];
    lastSec.current = 99;
  }, []);

  const finish = useCallback(
    (who: number[], reason: "bull" | "score") => {
      setBanner(null);
      setWinners(who);
      setWinReason(reason);
      phaseRef.current = "gameOver";
      setPhase("gameOver");
      sfx.victory();
    },
    [],
  );

  const endRound = useCallback(() => {
    if (endScheduled.current) return;
    endScheduled.current = true;
    phaseRef.current = "roundEnd";
    setPhase("roundEnd");

    const now = runsRef.current;
    const scores = now.map((r) => r.points);
    const hist = [...historyRef.current, scores];
    historyRef.current = hist;
    setHistory(hist);

    const tots = players.map((_, i) => hist.reduce((s, r) => s + (r[i] ?? 0), 0));
    setTotals(tots);

    const rows: BannerRow[] = now.map((r, i) => ({ i, cm: r.cm, pts: r.points }));
    const rn = roundRef.current;

    if (rn >= ROUNDS) {
      const max = Math.max(...tots);
      const who = tots.map((t, i) => (t === max ? i : -1)).filter((i) => i >= 0);
      setBanner({
        jp: "終局",
        title: "MATCH OVER",
        sub: who.length > 1 ? "the arrows are level — counting again" : `${players[who[0]].name} wins with ${max} points`,
        rows,
      });
      after(2600, () => finish(who, "score"));
      return;
    }

    sfx.roundUp();
    setBanner({
      jp: `第${rn}回戦 終了`,
      title: `ROUND ${rn} COMPLETE`,
      sub: `Round ${rn + 1} — the markers quicken ×${(SPEED[rn] / SPEED[0]).toFixed(2)}`,
      rows,
    });
    after(2900, () => {
      setBanner(null);
      beginCountdown(rn + 1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [after, finish, players]);

  const beginCountdown = useCallback(
    (r: number) => {
      clearTimers();
      endScheduled.current = false;
      lockedRef.current = flags(N);
      landedRef.current = flags(N);
      roundRef.current = r;
      setRound(r);
      setBanner(null);
      setCallout(null);
      syncRuns(freshRuns(N));
      setWinners(null);
      setWinReason(null);
      setCount(3);
      phaseRef.current = "countdown";
      setPhase("countdown");

      for (let i = 0; i < N; i++) {
        posRef.current[i] = (Math.random() * 1.5 - 0.75) * (i % 2 === 0 ? 1 : 0.86);
        dirRef.current[i] = i % 2 === 0 ? 1 : -1;
      }
      paint();

      sfx.count(3);
      after(700, () => {
        setCount(2);
        sfx.count(2);
      });
      after(1400, () => {
        setCount(1);
        sfx.count(1);
      });
      after(2100, () => {
        setCount(0);
        sfx.count(0);
      });
      after(2560, () => beginLive());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [after, beginLive, clearTimers, paint, N],
  );

  /* ---------------- throwing ---------------- */

  const lock = useCallback(
    (i: number, auto: boolean) => {
      if (lockedRef.current[i]) return;
      lockedRef.current[i] = true;

      const pos = posRef.current[i];
      const d = Math.abs(pos);
      const cm = d * BAR_CM;
      const points = scoreFor(d);
      const zone = zoneFor(d);
      const bull = d <= BULLSEYE_D;
      const throwId = ++seq.current;

      paint();
      sfx.throwSfx();
      if (!auto) sfx.lock();

      syncRuns(
        runsRef.current.map((r, idx) =>
          idx === i ? { ...r, status: "flying", pos, cm, points, zone, bull, auto, throwId } : r,
        ),
      );

      after(FLIGHT_MS, () => {
        landedRef.current[i] = true;
        syncRuns(runsRef.current.map((r, idx) => (idx === i ? { ...r, status: "landed" } : r)));
        sfx.hit(points, bull);
        setPulseId((p) => p + 1);
        setCallout({ i, throwId });
        if (bull || points >= 62) setShakeId((s) => s + 1);

        if (bull) {
          setBanner({
            jp: "的中！",
            title: "BULLSEYE",
            sub: `${players[i].name} — dead centre! +100 PTS`,
            gold: true,
          });
          after(2300, () => setBanner((b) => (b && b.jp === "的中！" ? null : b)));
        }

        after(1900, () => setCallout((c) => (c && c.throwId === throwId ? null : c)));

        if (phaseRef.current === "live" && landedRef.current.every(Boolean)) {
          after(1000, () => endRound());
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [after, endRound, paint, players],
  );

  const press = useCallback(
    (i: number) => {
      if (phaseRef.current !== "live") return;
      if (lockedRef.current[i]) return;
      lock(i, false);
    },
    [lock],
  );

  /* ---------------- the loop ---------------- */

  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const step = (t: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.05, Math.max(0, (t - last) / 1000));
      last = t;

      const p = phaseRef.current;
      if (p !== "countdown" && p !== "live") return;

      const sp = SPEED[roundRef.current - 1] ?? SPEED[0];
      let moving = false;
      for (let i = 0; i < N; i++) {
        if (lockedRef.current[i]) continue;
        moving = true;
        let np = posRef.current[i] + dirRef.current[i] * sp * dt;
        if (np >= 1) {
          np = 2 - np;
          dirRef.current[i] = -1;
        } else if (np <= -1) {
          np = -2 - np;
          dirRef.current[i] = 1;
        }
        posRef.current[i] = np;
        const el = markerEls.current[i];
        if (el) {
          el.style.setProperty("--pos", np.toFixed(4));
          el.style.setProperty("--dir", dirRef.current[i] > 0 ? "1" : "-1");
          el.style.setProperty("--trail-o", (0.3 + Math.min(0.55, sp * 0.28)).toFixed(2));
          el.style.setProperty("--speed-scale", (0.7 + sp * 0.45).toFixed(2));
        }
      }
      if (!moving) return;

      if (p === "live") {
        const total = ROUND_TIME[roundRef.current - 1] ?? 10;
        fuseLeft.current = Math.max(0, fuseLeft.current - dt);
        const rem = fuseLeft.current;
        const frac = Math.max(0, Math.min(1, rem / total));
        if (fuseFillRef.current) fuseFillRef.current.style.setProperty("--f", frac.toFixed(4));
        if (fuseValRef.current) fuseValRef.current.textContent = rem.toFixed(1);
        const danger = rem <= 3.05;
        if (fuseRef.current) fuseRef.current.classList.toggle("is-danger", danger);
        if (fuseValRef.current) fuseValRef.current.classList.toggle("is-danger", danger);

        const sec = Math.ceil(rem);
        if (sec !== lastSec.current) {
          lastSec.current = sec;
          if (sec > 0 && sec <= 3) sfx.fuseTick();
        }

        if (rem <= 0) {
          for (let i = 0; i < N; i++) if (!lockedRef.current[i]) lock(i, true);
        }
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [N, lock]);

  /* ---------------- top level actions ---------------- */

  const start = useCallback(() => {
    sfx.unlock();
    setHistory([]);
    historyRef.current = [];
    setTotals(zeros(N));
    beginCountdown(1);
  }, [N, beginCountdown]);

  const restart = useCallback(() => {
    sfx.ui();
    start();
  }, [start]);

  const toTitle = useCallback(() => {
    clearTimers();
    sfx.ui();
    phaseRef.current = "title";
    setPhase("title");
    setBanner(null);
    setCallout(null);
    setWinners(null);
    setWinReason(null);
    setHistory([]);
    historyRef.current = [];
    setTotals(zeros(N));
    setRound(1);
    roundRef.current = 1;
    syncRuns(freshRuns(N));
  }, [N, clearTimers]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      sfx.setMuted(!m);
      if (m) sfx.ui();
      return !m;
    });
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const maxTotal = Math.max(0, ...totals);
  const leaders = maxTotal > 0 ? totals.map((t, i) => (t === maxTotal ? i : -1)).filter((i) => i >= 0) : [];

  return {
    phase,
    round,
    count,
    runs,
    history,
    totals,
    leaders,
    winners,
    winReason,
    banner,
    callout,
    shakeId,
    pulseId,
    muted,
    speedMult: SPEED[round - 1] / SPEED[0],
    fuseTotal: ROUND_TIME[round - 1],
    setMarkerEl,
    fuseRef,
    fuseFillRef,
    fuseValRef,
    press,
    start,
    restart,
    toTitle,
    toggleMute,
  };
}