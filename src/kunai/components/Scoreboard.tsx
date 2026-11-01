import { type CSSProperties } from "react";
import { ROUNDS } from "../game/config";
import { usePlayers } from "../players";
import type { Run } from "../game/useEngine";

interface Props {
  runs: Run[];
  history: number[][];
  winners: number[] | null;
}

export default function Scoreboard({ runs, history, winners }: Props) {
  const PLAYERS = usePlayers();
  const liveTotals = PLAYERS.map((_, i) => {
    const done = history.reduce((s, r) => s + (r[i] ?? 0), 0);
    const cur = history.length < ROUNDS && runs[i].status === "landed" ? runs[i].points : 0;
    return done + cur;
  });

  const bestScore = Math.max(...liveTotals);
  const leaders = bestScore > 0 ? liveTotals.map((v, i) => (v === bestScore ? i : -1)).filter((i) => i >= 0) : [];

  return (
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
              className={[
                "srow",
                "scored",
                isLeader ? "lead" : "",
                isWinner ? "winner-row" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ ["--c" as string]: p.color } as CSSProperties}
            >
              <span className="bar" />
              <div className="srow-id">
                <span className="cap">{p.key.toUpperCase()}</span>
                <div className="srow-details">
                  <div className="srow-header">
                    <span className="nm">{p.name}</span>
                  </div>
 
                </div>
              </div>

              <div className="srow-right">
                <div className="rpips">
                  {Array.from({ length: ROUNDS }, (_, k) => {
                    const v = history[k]?.[i];
                    const cur = k === history.length && r.status === "landed" ? r.points : undefined;
                    const shown = v ?? cur;
                    const isBull = shown === 100;
                    return (
                      <div key={k} className="rpip-wrapper"> 
                        <span
                          className={`rpip${shown !== undefined ? " filled" : ""}${shown === 0 ? " zero" : ""}${isBull ? " bull" : ""}`}
                        >
                          {isBull ? "🎯 100" : shown !== undefined ? shown : "–"}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="total-display"> 
                  <div className="total">{liveTotals[i]}</div>
                </div>
              </div>

              {isLeader && <span className="crown">👑 LEAD</span>}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
