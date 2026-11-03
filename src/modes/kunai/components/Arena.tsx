import { useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from "react";
import { BAR_CM, MATO_D } from "../game/config";
import { usePlayers } from "../players";
import type { Banner, KunaiPhase, Run } from "../game/engine";
import { Kunai, Mato } from "./Icons";

/** Vertical offset of each player's kunai on the board, by player count. */
const LANES: Record<number, number[]> = { 3: [-11, 0, 11], 4: [-14, -5, 5, 14] };
const BASE_ROT = [-6, 3, -3, 6];

interface Props {
  runs: Run[];
  phase: KunaiPhase;
  count: number;
  banner: Banner | null;
  callout: { i: number; throwId: number } | null;
  shakeId: number;
  pulseId: number;
  fuseRef: RefObject<HTMLDivElement | null>;
  fuseFillRef: RefObject<HTMLDivElement | null>;
  fuseValRef: RefObject<HTMLSpanElement | null>;
}

export default function Arena({
  runs,
  phase,
  count,
  banner,
  callout,
  shakeId,
  pulseId,
  fuseRef,
  fuseFillRef,
  fuseValRef,
}: Props) {
  const PLAYERS = usePlayers();
  const lanes = LANES[PLAYERS.length] ?? LANES[4];
  const [shaking, setShaking] = useState(false);
  const [pulsing, setPulsing] = useState(false);
  const [bullseyeFlash, setBullseyeFlash] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setShaking(true);
    const t = window.setTimeout(() => setShaking(false), 560);
    return () => window.clearTimeout(t);
  }, [shakeId]);

  useEffect(() => {
    if (!pulseId) return;
    setPulsing(true);
    const hasBull = runs.some((r) => r.bull && r.status === "landed");
    if (hasBull) {
      setBullseyeFlash(true);
      const tb = window.setTimeout(() => setBullseyeFlash(false), 1200);
      return () => window.clearTimeout(tb);
    }
    const t = window.setTimeout(() => setPulsing(false), 900);
    return () => window.clearTimeout(t);
  }, [pulseId, runs]);

  useEffect(() => {
    if (!callout) {
      setLeaving(false);
      return;
    }
    const t = window.setTimeout(() => setLeaving(true), 1600);
    return () => window.clearTimeout(t);
  }, [callout]);

  const ticks = useMemo(() => {
    const out: { cm: number; left: number; major: boolean }[] = [];
    for (let cm = -BAR_CM; cm <= BAR_CM; cm += 2) {
      const major = cm % 10 === 0;
      out.push({
        cm,
        left: 50 + (cm / BAR_CM) * 45,
        major,
      });
    }
    return out;
  }, []);

  const calloutRun = callout ? runs[callout.i] : null;
  const live = phase === "live";

  return (
    <section
      className={`kb-panel kb-arena${shaking ? " shake" : ""}${bullseyeFlash ? " flash-gold" : ""}`}
    >
      {/* Fuse / Timer Bar styled as dynamic burning ninja powder fuse */}
      <div className="fuse-row">
        <div className="fuse-label-group">
          <span className="fuse-icon">🧨</span>
        </div>
        <div className="fuse" ref={fuseRef} style={{ flex: 1 }}>
          <div className="rope-texture" />
          <div className="fill" ref={fuseFillRef} style={{ ["--f" as string]: live ? 1 : 0 }}>
            <span className="spark-head" />
            <span className="smoke-puff" />
          </div>
        </div>
        <span className="val" ref={fuseValRef}>
          {live ? "0.0" : "--"}
        </span>
      </div>

      {/* Main Target Board (Cedar Planks, Torii Accents, Target & Embedded Blades) */}
      <div className="board-wrap">
        <div className="board">
          {/* Iron corner brackets for authentic Japanese woodwork feel */}
          <span className="iron-corner tl" />
          <span className="iron-corner tr" />
          <span className="iron-corner bl" />
          <span className="iron-corner br" />

          {/* Sconce candles reflecting on board edges */}
          <div className="sconce-light left" />
          <div className="sconce-light right" />

          {/* Golden bullseye axis centerline */}
          <div className="board-axis" />

          {/* Authentic Straw Kasumi-Mato Target */}
          <div className={`mato${pulsing ? " pulse" : ""}`}>
            <Mato />
          </div>

          {/* Bullseye Gold Rays Effect */}
          {bullseyeFlash && (
            <div className="gold-rays" aria-hidden="true">
              {Array.from({ length: 12 }, (_, i) => (
                <span key={i} className="ray" style={{ transform: `rotate(${i * 30}deg)` }} />
              ))}
            </div>
          )}

          {/* Distance guides + flying & stuck kunai */}
          {runs.map((r, i) => {
            if (r.status !== "flying" && r.status !== "landed") return null;
            const x = r.pos * 45;
            const y = lanes[i];
            const p = PLAYERS[i];
            const off = Math.abs(r.pos) > MATO_D;

            return (
              <div key={`kunai-group-${r.throwId}`}>
                {/* Landing impacts, shockwaves, sparks & dust */}
                {r.status === "landed" && (
                  <div
                    className="impact"
                    style={{
                      ["--x" as string]: x,
                      ["--y" as string]: y,
                      ["--c" as string]: p.color,
                    }}
                  >
                    <span className="dust" />
                    <span className="shock" />
                    {r.bull && <span className="bull-ring" />}
                    {Array.from({ length: r.bull ? 16 : 10 }, (_, s) => (
                      <span
                        key={s}
                        className="spark"
                        style={
                          {
                            "--a": `${-150 + s * (r.bull ? 22 : 30) + (i % 2 ? 8 : 0)}deg`,
                            "--len": `${(r.bull ? 26 : 16) + ((s * 7 + i * 11) % 24)}px`,
                            "--c": r.bull ? "#f8ca4d" : off ? "#c8a271" : p.color,
                          } as CSSProperties
                        }
                      />
                    ))}
                  </div>
                )}

                {/* Stuck kunai with blade wobble and cloth tassel */}
                <div
                  className="stuck"
                  style={
                    {
                      ["--x" as string]: x,
                      ["--y" as string]: y,
                      ["--rot" as string]: `${BASE_ROT[i] + r.pos * 2.2}deg`,
                      ["--c" as string]: p.color,
                    } as CSSProperties
                  }
                >
                  <div className="flight">
                    <Kunai color={p.color} className="blade" tassel={r.status === "landed"} />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Big Floating Distance Callout */}
          {callout && calloutRun && (
            <div
              className={`callout${calloutRun.bull ? " big" : ""}${leaving ? " out" : ""}`}
              style={{ ["--c" as string]: PLAYERS[callout.i].color } as CSSProperties}
            >
              <div className="cm">
                {calloutRun.bull ? (
                  <span className="bull-text">BULLSEYE!</span>
                ) : (
                  <>
                    {calloutRun.cm.toFixed(1)}
                    <small>cm off</small>
                  </>
                )}
              </div>
              <div className="meta">
                <span className="pts">+{calloutRun.points} PTS</span>
              </div>
            </div>
          )}

          {/* Countdown Overlay */}
          {phase === "countdown" && (
            <div className="flash-layer">
              <div key={count} className={`countdown${count === 0 ? " go" : ""}`}>
                {count === 0 ? "THROW!" : count}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Round Banner Announcement */}
        {banner && (
          <div className={`banner${banner.gold ? " gold" : ""}`} key={banner.title}>
            <div className="t">{banner.title}</div>
            {banner.rows && (
              <div className="banner-rows">
                {banner.rows.map((row, k) => (
                  <div
                    className="banner-row"
                    key={row.i}
                    style={
                      {
                        ["--c" as string]: PLAYERS[row.i].color,
                        animationDelay: `${0.1 + k * 0.08}s`,
                      } as CSSProperties
                    }
                  >
                    <div className="cm">{row.pts}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Precision Centimetre Ruler */}
        <div className="ruler">
          <div className="zero">
            <span className="zero-glow" />
          </div>
          <div className="ticks">
            {ticks.map((t, i) => (
              <span
                key={i}
                className={`tick ${t.major ? "major" : "minor"}`}
                style={{ left: `${t.left}%` }}
              />
            ))}
          </div>

          {/* Player landed markers on ruler */}
          {runs.map((r, i) =>
            r.status === "landed" ? (
              <div
                key={`ruler-mark-${r.throwId}`}
                className="ruler-mark"
                style={
                  {
                    ["--x" as string]: r.pos * 45,
                    ["--c" as string]: PLAYERS[i].color,
                  } as CSSProperties
                }
              >
                <i />
              </div>
            ) : null,
          )}
        </div>
      </div>
    </section>
  );
}
