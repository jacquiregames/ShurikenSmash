import { useMemo, type CSSProperties } from "react";
import { ROUNDS, rankWord } from "../game/config";
import { usePlayers } from "../players";
import { ShurikenIcon } from "./Icons";

interface Props {
  winners: number[];
  reason: "bull" | "score";
  history: number[][];
  totals: number[];
  onRematch: () => void;
  onTitle: () => void;
}

export default function GameOver({ winners, history, totals, onRematch, onTitle }: Props) {
  const PLAYERS = usePlayers();
  const order = useMemo(
    () => PLAYERS.map((_, i) => i).sort((a, b) => totals[b] - totals[a] || a - b),
    [PLAYERS, totals],
  );

  const petals = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const r = (n: number) => (((Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1) + 1) % 1;
        return {
          left: `${(r(1) * 100).toFixed(2)}%`,
          dur: `${(5 + r(2) * 6).toFixed(2)}s`,
          delay: `${(-r(3) * 9).toFixed(2)}s`,
          dx: `${((r(4) * 2 - 1) * 260).toFixed(0)}px`,
          spin: `${(r(5) * 1080 - 540).toFixed(0)}deg`,
          size: 8 + r(6) * 14,
          kind: i % 3,
          color: i % 3 === 0 ? "#e3b23c" : i % 3 === 1 ? "#e2483a" : "#f4ead6",
        };
      }),
    [],
  );

  const tie = winners.length > 1;
  const lead = PLAYERS[winners[0]];
  const best = Math.max(...totals);

  return (
    <div className="over" role="dialog" aria-modal="true" aria-label="Match result">
      {petals.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={
            {
              left: p.left,
              animationDuration: p.dur,
              animationDelay: p.delay,
              "--dx": p.dx,
              "--spin": p.spin,
              color: p.color,
            } as CSSProperties
          }
        >
          {p.kind === 2 ? (
            <span
              style={{
                display: "block",
                width: p.size,
                height: p.size * 0.7,
                background: p.color,
                opacity: 0.5,
                borderRadius: "60% 10% 60% 10%",
              }}
            />
          ) : (
            <span style={{ display: "block", opacity: 0.75 }}>
              <ShurikenIcon size={p.size} />
            </span>
          )}
        </span>
      ))}

      <div className="over-card">
        <div className="seal">忍</div>
        <div className="over-kicker">終局 · match complete</div>
        <h2 className="over-title">
          {tie ? (
            <>
              SHARED <em>HONOUR</em>
            </>
          ) : (
            <>
              {lead.name} <em>WINS</em>
            </>
          )}
        </h2>
        <p className="over-sub">
          {tie
            ? `Level on ${best} points after ${ROUNDS} rounds — a tie is a victory for both`
            : `Highest accuracy after ${ROUNDS} rounds · ${best} of ${ROUNDS * 100} points`}
        </p>

        <div className="winners">
          {winners.map((w, k) => {
            const p = PLAYERS[w];
            return (
              <div
                className="wcard"
                key={p.id}
                style={
                  {
                    ["--c" as string]: p.color,
                    ["--dl" as string]: `${0.15 + k * 0.12}s`,
                  } as CSSProperties
                }
              >
                <span className="halo" />
                <span className="cap">{p.key}</span>
                <div className="nm">{p.name}</div>
                <div className="sc">
                  {totals[w]}
                  <small>PTS</small>
                </div>
                <div className="tag">
                  {tie ? "co-champion · 引き分け" : rankWord(0)} · {p.jp}
                </div>
              </div>
            );
          })}
        </div>

        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 46 }}>#</th>
              <th className="name">Shinobi</th>
              {Array.from({ length: ROUNDS }, (_, r) => (
                <th key={r}>Round {r + 1}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.map((i, rank) => {
              const p = PLAYERS[i];
              const isW = winners.includes(i);
              return (
                <tr
                  key={p.id}
                  className={`${isW ? "win" : ""} ${rank > 0 && totals[i] === 0 ? "dim" : ""}`}
                  style={{ ["--c" as string]: p.color } as CSSProperties}
                >
                  <td style={{ color: isW ? "var(--gold)" : "var(--ash)" }}>{rank + 1}</td>
                  <td className="name">
                    {p.key} · {p.name}
                  </td>
                  {Array.from({ length: ROUNDS }, (_, r) => {
                    const v = history[r]?.[i];
                    return <td key={r}>{v === undefined ? "–" : v}</td>;
                  })}
                  <td className="tot">{totals[i]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="over-actions">
          <button type="button" className="btn" onClick={onRematch}>
            <span className="pulse-ring" />
            Rematch
            <span className="kb">SPACE</span>
          </button>
          <button type="button" className="btn ghost" onClick={onTitle}>
            Back to menu
            <span className="kb">ESC</span>
          </button>
          <span className="title-note">Same keys. Faster markers. Sharper shame.</span>
        </div>
      </div>
    </div>
  );
}
