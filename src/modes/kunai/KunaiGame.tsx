import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { toggleMuted } from "../../shared/audio/context";
import { useMuted } from "../../shared/audio/useMuted";
import { Backdrop } from "../../shared/components/Backdrop";
import { SoundOff, SoundOn } from "../../shared/components/icons";
import type { Ninja } from "../../shared/game/types";
import AimLane from "./components/AimLane";
import Arena from "./components/Arena";
import GameOver from "./components/GameOver";
import Scoreboard from "./components/Scoreboard";
import { ROUNDS, SPEED, buildKunaiPlayers } from "./game/config";
import type { KunaiPhase } from "./game/engine";
import { useEngine } from "./game/useEngine";
import * as sfx from "./game/sfx";
import { PlayersContext } from "./players";
import "./kunai.css";

const PHASE_TAG: Record<KunaiPhase, string> = {
  title: "GET READY",
  countdown: "READY",
  live: "THROW!",
  roundEnd: "ROUND OVER",
  gameOver: "MATCH OVER",
};

interface KunaiGameProps {
  /** The ninjas playing this match (3 or 4), in seat order. */
  ninjas: readonly Ninja[];
  /** Logo shown in the top bar. */
  logoSrc: string;
  logoAlt: string;
  /** Called when the players quit (Esc / close button / "Back to menu"). */
  onExit: () => void;
}

/** Kunai Bullseye: a self-contained 3-4 player accuracy duel. Starts as soon as it mounts. */
export default function KunaiGame({ ninjas, logoSrc, logoAlt, onExit }: KunaiGameProps) {
  // The roster is fixed for the life of the match, so keep one stable snapshot.
  const [players] = useState(() => buildKunaiPlayers(ninjas));
  const codeToPlayer = useMemo(
    () => Object.fromEntries(players.map((p, i) => [p.code, i] as const)) as Record<string, number>,
    [players],
  );

  const { engine, state } = useEngine(players);
  const { phase, round, count, runs, history, totals, winners, winReason, banner, callout } = state;
  const { shakeId, pulseId } = state;
  const { press, start, setMarkerEl, fuseRef, fuseFillRef, fuseValRef } = engine;
  const muted = useMuted();

  // No title screen: the menu is the title screen, so the match begins immediately.
  useEffect(() => {
    start();
  }, [start]);

  const restart = () => {
    sfx.ui();
    start();
  };
  const toggleMute = () => {
    toggleMuted();
    if (muted) sfx.ui();
  };

  /* ---- one keyboard, three or four shinobi. Escape and M are handled app-wide. ---- */
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const isConfirm = ev.code === "Space" || ev.code === "Enter" || ev.code === "NumpadEnter";
      if (isConfirm) ev.preventDefault();
      if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;

      if (phase === "gameOver") {
        if (isConfirm || ev.code === "KeyR") {
          sfx.ui();
          start();
        }
        return;
      }
      const seat = codeToPlayer[ev.code];
      if (seat !== undefined) {
        press(seat);
        return;
      }
      if (ev.code === "KeyR" && phase !== "live") {
        sfx.ui();
        start();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, codeToPlayer, press, start]);

  const soundBtn = (
    <button
      type="button"
      className={`icon-btn${muted ? " off" : ""}`}
      onClick={toggleMute}
      title={muted ? "Unmute Sound (M)" : "Mute Sound (M)"}
      aria-label={muted ? "Unmute Sound" : "Mute Sound"}
    >
      {muted ? <SoundOff /> : <SoundOn />}
    </button>
  );

  const speedMultiplier = (SPEED[round - 1] / SPEED[0]).toFixed(2);

  return (
    <PlayersContext.Provider value={players}>
      <div className="kb-root">
        <Backdrop vignette />
        <div className="shell">
          <header className="topbar">
            <div className="brand">
              <img className="brand-logo" src={logoSrc} alt={logoAlt} draggable={false} />
            </div>

            <div className="topmid">
              <div className="round-pips">
                {Array.from({ length: ROUNDS }, (_, i) => {
                  const n = i + 1;
                  const cls = n < round ? "pip done" : n === round ? "pip is-active" : "pip";
                  return (
                    <div
                      className={cls}
                      key={n}
                      title={`Round ${n}: ${(SPEED[i] / SPEED[0]).toFixed(2)}x speed`}
                    >
                      <span className="n">{["一", "二", "三"][i]}</span>
                      <span className="l">ROUND {n}</span>
                    </div>
                  );
                })}
              </div>
              <div className="phase-tag">
                {PHASE_TAG[phase]}{" "}
                {phase === "live" || phase === "countdown" ? (
                  <b>
                    · {round}/{ROUNDS} ({speedMultiplier}×)
                  </b>
                ) : null}
              </div>
            </div>

            <div className="topright">
              <div className="hint-keys" title="Throw your kunai with your key">
                KEYS:
                {players.map((p) => (
                  <span
                    className="tiny-cap"
                    key={p.id}
                    style={{
                      color: p.color,
                      borderColor: `${p.color}88`,
                      background: `${p.color}18`,
                    }}
                    title={`${p.label} (${p.name}): key [${p.key}]`}
                  >
                    {p.key}
                  </span>
                ))}
              </div>
              {soundBtn}
              <button
                type="button"
                className="icon-btn"
                onClick={restart}
                title="Restart Match (R)"
                aria-label="Restart Match"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              </button>
              <button
                type="button"
                className="icon-btn"
                onClick={onExit}
                title="Back to Menu (Esc)"
                aria-label="Back to Menu"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          </header>

          <div className="stage">
            <Scoreboard runs={runs} history={history} winners={winners} />
            <Arena
              runs={runs}
              phase={phase}
              round={round}
              count={count}
              banner={banner}
              callout={callout}
              shakeId={shakeId}
              pulseId={pulseId}
              fuseRef={fuseRef}
              fuseFillRef={fuseFillRef}
              fuseValRef={fuseValRef}
            />
          </div>

          <div className="lanes" style={{ "--np": players.length } as CSSProperties}>
            {players.map((p, i) => (
              <AimLane
                key={p.id}
                index={i}
                run={runs[i]}
                phase={phase}
                setMarkerEl={setMarkerEl}
                onPress={press}
              />
            ))}
          </div>

          <p className="sr" aria-live="polite">
            {runs
              .map((r, i) =>
                r.status === "landed"
                  ? `${players[i].label} ${r.bull ? "bullseye" : `${r.cm.toFixed(1)} centimetres off`}, ${r.points} points. `
                  : "",
              )
              .join("")}
          </p>
        </div>

        {phase === "gameOver" && winners && winReason && (
          <GameOver
            winners={winners}
            reason={winReason}
            history={history}
            totals={totals}
            onRematch={restart}
            onTitle={onExit}
          />
        )}
      </div>
    </PlayersContext.Provider>
  );
}
