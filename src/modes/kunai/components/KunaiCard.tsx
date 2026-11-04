import { Fragment, memo, useEffect, useRef, type CSSProperties } from "react";
import { PlayerCardShell } from "../../../shared/components/PlayerCardShell";
import { ResultBadge } from "../../../shared/components/ResultBadge";
import { getImageUrl } from "../../../shared/config/assets";
import type { PlayerResultInfo } from "../../../shared/game/types";
import { BAR_CM, MATO_D, ROUNDS, TARGET_RINGS, type KunaiPlayer } from "../game/config";
import type { KunaiPhase, Run } from "../game/engine";
import { Kunai } from "./Icons";

/** Where the calibration ticks sit along the track, in % from its left edge. */
const TICKS: readonly number[] = Array.from(
  { length: (2 * BAR_CM) / 4 + 1 },
  (_, k) => 50 + ((-BAR_CM + k * 4) / BAR_CM) * 45,
);

/**
 * The track's bands, left to right: the target's rings mirrored around the centre. Each flex
 * weight is the ring's thickness, so the bands line up with the painted rings.
 */
const ZONE_BAND = (() => {
  let inner = 0;
  const rings = TARGET_RINGS.map((r) => {
    const band = { width: r.outer - inner, color: r.color };
    inner = r.outer;
    return band;
  });
  const [dot, ...outward] = rings;
  return [...[...outward].reverse(), { ...dot, width: dot.width * 2 }, ...outward];
})();

const BULL_POINTS = 100;

/** The target art is 78% of the board's width (see .kc-mato), so its radius is 39%. */
const MATO_RADIUS_PCT = 39;

/**
 * Where a kunai sticks, in % of the board's width from its centre. The track's rim (MATO_D)
 * maps to the target's rim, so the kunai lands in the same ring the marker was over.
 * Backboard throws are kept just inside the board's edge.
 */
const landingX = (pos: number) => Math.max(-48, Math.min(48, (pos / MATO_D) * MATO_RADIUS_PCT));

/** Presses the on-screen keycap while its real key is held down. */
function useKeycap(code: string) {
  const padRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (!e.repeat && e.code === code) padRef.current?.classList.add("down");
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === code) padRef.current?.classList.remove("down");
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [code]);

  const press = () => padRef.current?.classList.add("down");
  const release = () => padRef.current?.classList.remove("down");
  return { padRef, press, release };
}

/** The R1 / R2 / R3 cells; the round being scored right now shows its landed throw. */
function RoundScores({ history, seat, live }: { history: number[][]; seat: number; live?: Run }) {
  return (
    <div className="srow-row2">
      {Array.from({ length: ROUNDS }, (_, k) => {
        const shown = history[k]?.[seat] ?? (k === history.length ? live?.points : undefined);
        const isBull = shown === BULL_POINTS;
        const cls = [
          "srow-round-cell",
          shown !== undefined && "filled",
          shown === 0 && "zero",
          isBull && "bull",
        ]
          .filter(Boolean)
          .join(" ");
        return (
          <div key={k} className={cls}>
            <span className="round-label">R{k + 1}</span>
            <span className="round-score">{shown ?? "–"}</span>
          </div>
        );
      })}
    </div>
  );
}

interface KunaiCardProps {
  player: KunaiPlayer;
  index: number;
  run: Run;
  phase: KunaiPhase;
  history: number[][];
  totalScore: number;
  isLeader: boolean;
  result?: PlayerResultInfo;
  setMarkerEl: (i: number, el: HTMLElement | null) => void;
  onPress: (i: number) => void;
}

export const KunaiCard = memo(function KunaiCard({
  player,
  index,
  run,
  phase,
  history,
  totalScore,
  isLeader,
  result,
  setMarkerEl,
  onPress,
}: KunaiCardProps) {
  const { padRef, press, release } = useKeycap(player.code);

  const isLive = phase === "live";
  const armed = isLive && run.status === "aiming";
  const flying = run.status === "flying";
  const landed = run.status === "landed";
  const locked = flying || landed;

  const kunaiX = landingX(run.pos);
  const off = Math.abs(run.pos) > MATO_D;
  const liveRun = isLive && landed ? run : undefined;

  const roundScores = <RoundScores history={history} seat={index} live={liveRun} />;

  return (
    <PlayerCardShell
      player={player}
      bgImage={player.bgImage}
      mode="kunai"
      isLeading={isLeader}
      isLocked={locked}
      result={result}
      onVideoEnd={() => {}}
    >
      {() => (
        <div className="kunai-card-content">
          {/* Top: the target and wherever the kunai lands */}
          <div className="kc-board-section">
            <div className="kc-board">
              <div className="kc-board-axis" />

              <div className={`kc-mato${landed ? " landed" : ""}${run.bull ? " bull" : ""}`}>
                <img
                  src={getImageUrl("kunai-target", "webp")}
                  alt="Target"
                  className="kc-mato-img"
                  draggable={false}
                />
              </div>

              {run.bull && landed && (
                <div className="gold-rays" aria-hidden="true">
                  {Array.from({ length: 12 }, (_, s) => (
                    <span key={s} className="ray" style={{ transform: `rotate(${s * 30}deg)` }} />
                  ))}
                </div>
              )}

              {landed && (
                <div
                  className="impact"
                  style={{ "--x": kunaiX, "--y": 0, "--c": player.color } as CSSProperties}
                >
                  <span className="dust" />
                  <span className="shock" />
                  {run.bull && <span className="bull-ring" />}
                  {Array.from({ length: run.bull ? 16 : 10 }, (_, s) => (
                    <span
                      key={s}
                      className="spark"
                      style={
                        {
                          "--a": `${-150 + s * (run.bull ? 22 : 30)}deg`,
                          "--len": `${(run.bull ? 26 : 16) + ((s * 7) % 24)}px`,
                          "--c": run.bull ? "#f8ca4d" : off ? "#c8a271" : player.color,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
              )}

              {locked && (
                <div
                  className="stuck"
                  style={
                    {
                      "--x": kunaiX,
                      "--y": 0,
                      "--rot": `${run.pos * 3.5}deg`,
                      "--c": player.color,
                    } as CSSProperties
                  }
                >
                  <div className="flight">
                    <Kunai color={player.color} className="blade" tassel={landed} />
                  </div>
                </div>
              )}

              {landed && !result && (
                <div className={`kc-target-score-overlay${run.bull ? " is-bull" : ""}`}>
                  <div className="kc-pts-main">{run.bull ? "BULLSEYE!" : `+${run.points} PTS`}</div>
                  <div className="kc-cm-sub">
                    {run.bull ? "🎯 0.0 cm" : `${run.cm.toFixed(1)} cm off`}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom: scoreboard and aim track while playing; round cells and badge at game over */}
          {result ? (
            <div className="kc-result-section">
              {roundScores}
              <ResultBadge result={result} />
            </div>
          ) : (
            <div className="kc-lane-section">
              <div className="kc-scoreboard-box">
                <div className="srow-row1">
                  <div className="srow-key">
                    <button
                      type="button"
                      ref={padRef}
                      className="pad"
                      tabIndex={-1}
                      aria-label={`${player.label} throw key ${player.key}`}
                      title={`Press [${player.key}] or tap to throw`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        press();
                        if (armed) onPress(index);
                      }}
                      onPointerUp={release}
                      onPointerLeave={release}
                    >
                      <span className="pad-key">{player.key}</span>
                    </button>
                  </div>

                  <div className="srow-name">
                    <span className="nm">{player.name}</span>
                    {isLeader && <span className="crown">👑</span>}
                  </div>

                  <div className="srow-total">
                    <span className="total-lbl">TOT</span>
                    <span className="total">{totalScore}</span>
                  </div>
                </div>

                {roundScores}
              </div>

              <div
                className={`kc-track-container${armed ? " is-active" : ""}${locked ? " is-locked" : ""}`}
                onPointerDown={() => armed && onPress(index)}
              >
                <div className="track">
                  <div className="zone-band">
                    {ZONE_BAND.map((ring, k) => (
                      <span
                        key={k}
                        className="zb"
                        style={{ flex: ring.width, background: ring.color }}
                      />
                    ))}
                  </div>

                  {TICKS.map((left) => (
                    <Fragment key={left}>
                      <span className="grid-tick" style={{ left: `${left}%` }} />
                      <span className="grid-tick b" style={{ left: `${left}%` }} />
                    </Fragment>
                  ))}

                  <div className="track-center">
                    <span className="tc-notch top" />
                    <span className="tc-core" />
                    <span className="tc-notch btm" />
                  </div>

                  <div className="marker" ref={(el) => setMarkerEl(index, el)} />

                  {locked && <div className="track-lock-pulse" />}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PlayerCardShell>
  );
});
