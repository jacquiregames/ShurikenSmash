import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { toggleMuted } from "../../shared/audio/context";
import { useMuted } from "../../shared/audio/useMuted";
import { Backdrop } from "../../shared/components/Backdrop";
import { Close, Restart, SoundOff, SoundOn } from "../../shared/components/icons";
import { getImageUrl } from "../../shared/config/assets";
import { competitionRank, placed, type RoundResults } from "../../shared/game/ranking";
import type { Ninja } from "../../shared/game/types";
import { KunaiCard } from "./components/KunaiCard";
import { ROUNDS, SPEED, buildKunaiPlayers } from "./game/config";
import { useEngine } from "./game/useEngine";
import * as sfx from "./game/sfx";
import "./kunai.css";

interface KunaiGameProps {
  ninjas: readonly Ninja[];
  logoSrc: string;
  logoAlt: string;
  onExit: () => void;
}

export default function KunaiGame({ ninjas, logoSrc, logoAlt, onExit }: KunaiGameProps) {
  const [players] = useState(() => buildKunaiPlayers(ninjas));
  const codeToPlayer = useMemo(
    () => Object.fromEntries(players.map((p, i) => [p.code, i] as const)) as Record<string, number>,
    [players],
  );

  const { engine, state } = useEngine(players);
  const { phase, round, count, runs, history, totals, banner } = state;
  const { press, start, setMarkerEl, fuseRef, fuseFillRef, fuseValRef } = engine;
  const muted = useMuted();

  // Match begins immediately on mount
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

  // Keyboard navigation & throwing
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const isConfirm = ev.code === "Space" || ev.code === "Enter" || ev.code === "NumpadEnter";
      if (isConfirm) ev.preventDefault();
      if (ev.repeat || ev.ctrlKey || ev.metaKey || ev.altKey) return;

      if (phase === "gameOver") {
        if (isConfirm) {
          sfx.ui();
          onExit();
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
  }, [phase, codeToPlayer, press, start, onExit]);

  // Live scoreboard totals & leaders
  const isLive = phase === "live";
  const liveTotals = useMemo(
    () =>
      players.map((_, i) => {
        const done = history.reduce((s, r) => s + (r[i] ?? 0), 0);
        const cur =
          isLive && history.length < ROUNDS && runs[i].status === "landed" ? runs[i].points : 0;
        return done + cur;
      }),
    [players, history, isLive, runs],
  );

  const bestScore = Math.max(...liveTotals);

  // Compute final RoundResults when match reaches gameOver
  const results: RoundResults | null = useMemo(() => {
    if (phase !== "gameOver") return null;
    const byPlayer: RoundResults["byPlayer"] = {};
    const winnerIds = new Set<number>();

    players.forEach((p, i) => {
      const score = totals[i];
      const rank = competitionRank(totals, score, (a, b) => a > b);
      byPlayer[p.id] = placed(rank, `${score} PTS`, players.length);
      if (rank === 1) winnerIds.add(p.id);
    });

    return { winnerIds, byPlayer };
  }, [phase, players, totals]);

  return (
    <div className={`game phase-${phase} kb-root`}>
      <Backdrop vignette />

      {/* Global Top Bar: Logo (left), Burning Fuse & Round Indicator (center), Mute & Actions (right) */}
      <header className="title-bar kc-topbar">
        <div className="title-bar-left">
          <img className="header-logo" src={logoSrc} alt={logoAlt} draggable={false} />
        </div>

        <div className="title-bar-center kc-topmid">
          {/* 3-Round Pips */}
          <div className="kc-round-pips">
            {Array.from({ length: ROUNDS }, (_, i) => {
              const n = i + 1;
              const cls = n < round ? "pip done" : n === round ? "pip is-active" : "pip";
              return (
                <div
                  className={cls}
                  key={n}
                  title={`Round ${n}: ${(SPEED[i] / SPEED[0]).toFixed(2)}x speed`}
                >
                  <span className="n">R{n}</span>
                </div>
              );
            })}
          </div>

          {/* Burning Fuse Powder Timer Bar */}
          <div className="fuse-row kc-fuse-bar">
            <span className="fuse-icon">🧨</span>
            <div className="fuse" ref={fuseRef}>
              <div className="rope-texture" />
              <div className="fill" ref={fuseFillRef} style={{ ["--f" as string]: isLive ? 1 : 0 }}>
                <span className="spark-head" />
              </div>
            </div>
            <span className="val" ref={fuseValRef}>
              {isLive ? "0.0" : "--"}
            </span>
          </div>
        </div>

        <div className="kc-topright">
          <button
            type="button"
            className={`icon-btn${muted ? " off" : ""}`}
            onClick={toggleMute}
            title={muted ? "Unmute Sound (M)" : "Mute Sound (M)"}
            aria-label={muted ? "Unmute Sound" : "Mute Sound"}
          >
            {muted ? <SoundOff /> : <SoundOn />}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={restart}
            title="Restart Match (R)"
            aria-label="Restart Match"
          >
            <Restart />
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onExit}
            title="Back to Menu (Esc)"
            aria-label="Back to Menu"
          >
            <Close />
          </button>
        </div>
      </header>

      {/* 4 Player Cards Arena */}
      <div className={`arena players-${players.length} kc-arena-grid`}>
        {players.map((p, i) => (
          <KunaiCard
            key={p.id}
            player={p}
            index={i}
            run={runs[i]}
            phase={phase}
            history={history}
            totalScore={liveTotals[i]}
            isLeader={bestScore > 0 && liveTotals[i] === bestScore}
            result={results?.byPlayer[p.id]}
            setMarkerEl={setMarkerEl}
            onPress={press}
          />
        ))}
      </div>

      {/* Global Countdown Overlay with Images */}
      {phase === "countdown" && (
        <div className="countdown-overlay" aria-live="assertive">
          {count > 0 ? (
            <img
              key={count}
              src={getImageUrl(String(count), "png")}
              alt={String(count)}
              className="countdown-img"
              draggable={false}
            />
          ) : (
            <div className="countdown-num" key="throw">
              THROW!
            </div>
          )}
        </div>
      )}

      {/* Round Complete Banner Announcement */}
      {banner && (
        <div className={`banner${banner.gold ? " gold" : ""}`} key={banner.title}>
          <div className="t">{banner.title}</div>
          {banner.rows && (
            <div className="banner-rows">
              {banner.rows.map((row) => (
                <div
                  className="banner-row"
                  key={row.i}
                  style={{ "--c": players[row.i].color } as CSSProperties}
                >
                  <div className="cm">+{row.pts} PTS</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Game Over Action Bar with Continue Button Below Player Cards */}
      {phase === "gameOver" && (
        <div className="results-action-bar">
          <div className="results-buttons">
            <button
              type="button"
              className="ghost-btn"
              onClick={onExit}
              aria-label="Return to Dojo"
            >
              <img src={getImageUrl("continue")} alt="" className="ghost-btn-img" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
