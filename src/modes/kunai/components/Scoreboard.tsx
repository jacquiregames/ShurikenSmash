import { type CSSProperties } from "react";
import { ROUNDS, SPEED } from "../game/config";
import { usePlayers } from "../players";
import type { KunaiPhase, Run } from "../game/engine";

interface Props {
  runs: Run[];
  history: number[][];
  winners: number[] | null;
  phase: KunaiPhase;
  round: number;
}

export default function Scoreboard({ runs, history, winners, phase, round }: Props) {
  const PLAYERS = usePlayers();
  const isLive = phase === "live";

  const liveTotals = PLAYERS.map((_, i) => {
    const done = history.reduce((s, r) => s + (r[i] ?? 0), 0);
    const cur = isLive && history.length < ROUNDS && runs[i].status === "landed" ? runs[i].points : 0;
    return done + cur;
  });

  const bestScore = Math.max(...liveTotals);
  const leaders =
    bestScore > 0 ? liveTotals.map((v, i) => (v === bestScore ? i : -1)).filter((i) => i >= 0) : [];

  return (
    <div className="board-col">
      {/* 3-Round Indicator directly above scoreboard */}
      <div className="round-pips" role="group" aria-label="Current round">
        {Array.from({ length: ROUNDS }, (_, i) => {
          const n = i + 1;
          const cls = n < round ? "pip done" : n === round ? "pip is-active" : "pip";
          return (
            <div
              className={cls}
              key={n}
              title={`Round ${n}: ${(SPEED[i] / SPEED[0]).toFixed(2)}x speed`}
            >
              <span className="n">ROUND {n}</span>
            </div>
          );
        })}
      </div>

      <aside className="kb-panel board-panel">
        <div className="panel-head">
          <div className="ph-left">
            <span className="shuriken-icon">🎯</span>
            <h2>SCOREBOARD</h2>
          </div>
        </div>

        <div className="scores">
          {PLAYERS.map((p, i) => {
            const r = runs[i];
            const isWinner = winners?.includes(i);
            const isLeader = leaders.includes(i) && !winners && bestScore > 0;
            return (
              <div
                key={`row-${p.id}`}
                className={["srow", isLeader ? "lead" : "", isWinner ? "winner-row" : ""]
                  .filter(Boolean)
                  .join(" ")}
                style={{ ["--c" as string]: p.color } as CSSProperties}
              >
                <span className="bar" />

                {/* Row 1: Key (left align), Player Name (center align), Total Score (right align) */}
                <div className="srow-row1">
                  <div className="srow-key">
                    <span className="cap">{p.key}</span>
                  </div>
                  <div className="srow-name">
                    <span className="nm">{p.name}</span>
                    {isLeader && <span className="crown">👑</span>}
                  </div>
                  <div className="srow-total">
                    <span className="total">{liveTotals[i]}</span>
                  </div>
                </div>

                {/* Row 2: Round 1 Score, Round 2 Score, Round 3 Score */}
                <div className="srow-row2">
                  {Array.from({ length: ROUNDS }, (_, k) => {
                    const v = history[k]?.[i];
                    const cur =
                      isLive && k === history.length && r.status === "landed" ? r.points : undefined;
                    const shown = v ?? cur;
                    const isBull = shown === 100;
                    return (
                      <div
                        key={k}
                        className={`srow-round-cell${shown !== undefined ? " filled" : ""}${shown === 0 ? " zero" : ""}${isBull ? " bull" : ""}`}
                      >
                        <span className="round-label">R{k + 1}</span>
                        <span className="round-score">
                          {isBull ? "100" : shown !== undefined ? shown : "–"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </div>
  );
}