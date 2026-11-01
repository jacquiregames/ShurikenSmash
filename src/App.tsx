import { useMemo } from "react";
import { MODE_DETAILS, getOutcomeVideoUrl, getImageUrl } from "./game/config";
import { computeResults } from "./game/results";
import { useGame } from "./hooks/useGame";
import { roundDuration } from "./game/reducer";
import { Timer } from "./components/Timer";
import { TsugitashiCounter } from "./components/TsugitashiCounter";
import { PlayerCard } from "./components/PlayerCard";
import { MenuPanel } from "./components/MenuPanel";
import KunaiGame from "./kunai/KunaiGame";
import "./App.css";

export default function App() {
  const { state, clock, actions } = useGame();
  const { phase, mode, numPlayers, ninjas, countdown, counts, strikeTimes, pulses, hits, stacks } = state;
  const { target, held, locked } = state;
  const { logoImage, title } = MODE_DETAILS[mode];
  const durationMs = roundDuration(state);
  const isTsugitashi = mode === "tsugitashi";
  const everyoneHolding = held.slice(0, numPlayers).every(Boolean);

  const players = useMemo(() => ninjas.slice(0, numPlayers), [ninjas, numPlayers]);
  const isRoundOver = phase === "video" || phase === "ended" || phase === "results";

  const results = useMemo(
    () =>
      isRoundOver ? computeResults({ mode, players, counts, strikeTimes, stacks, target, locked }) : null,
    [isRoundOver, mode, players, counts, strikeTimes, stacks, target, locked]
  );

  const activeCounts = counts.slice(0, numPlayers);
  const topScore = Math.max(...activeCounts);
  const maxCount = Math.max(1, topScore);
  const leadersCount = activeCounts.filter((c) => c === topScore).length;

  // Kunai Bullseye is a self-contained game: it replaces the whole screen until players exit.
  if (phase === "kunai") {
    return (
      <KunaiGame
        ninjas={players}
        logoSrc={MODE_DETAILS.kunai.logoImage ?? ""}
        logoAlt={MODE_DETAILS.kunai.title}
        onExit={actions.returnToMenu}
      />
    );
  }

  return (
    <div className={`game phase-${phase}`}>
      <div
        className="bg"
        aria-hidden="true"
        style={{ backgroundImage: `url("${getImageUrl("background")}")` }}
      />

      <header className="title-bar">
        {logoImage ? (
          <img src={logoImage} alt={title} className="header-logo" />
        ) : (
          <h1 className="header-title">{title}</h1>
        )}
      </header>

      {phase === "menu" && (
        <MenuPanel
          mode={mode}
          numPlayers={numPlayers}
          players={players}
          onSelectMode={actions.selectMode}
          onSelectNumPlayers={actions.selectPlayerCount}
          onSelectPlayerColor={actions.selectColor}
          onStartGame={actions.start}
        />
      )}

      {phase !== "menu" && (
        <>
          {isTsugitashi ? (
            <TsugitashiCounter phase={phase} clock={clock} target={target} durationMs={durationMs} />
          ) : (
            <Timer phase={phase} mode={mode} clock={clock} durationMs={durationMs} />
          )}

          <div className={`arena players-${numPlayers}`}>
            {players.map((p) => {
              const count = counts[p.id];
              const isLocked = mode === "blind" && strikeTimes[p.id] !== undefined;
              const isLeading =
                mode === "mash" &&
                phase === "playing" &&
                count > 0 &&
                count === topScore &&
                leadersCount === 1;

              const outcome =
                results && mode !== "stack" ? (results.winnerIds.has(p.id) ? "win" : "lose") : undefined;
              const videoUrl =
                phase === "video" && outcome
                  ? getOutcomeVideoUrl(p.colorName, outcome)
                  : undefined;

              return (
                <PlayerCard
                  key={p.id}
                  player={p}
                  mode={mode}
                  count={count}
                  maxCount={maxCount}
                  isLeading={isLeading}
                  pulseId={pulses[p.id]}
                  hits={hits[p.id]}
                  stack={stacks[p.id]}
                  tsugi={isTsugitashi ? { held: held[p.id], locked: locked[p.id], target } : undefined}
                  lockedTime={strikeTimes[p.id]}
                  isLocked={isLocked}
                  outcome={outcome}
                  videoUrl={videoUrl}
                  result={phase === "results" ? results?.byPlayer[p.id] : undefined}
                  onVideoEnd={actions.videoEnded}
                  onHitDone={actions.hitDone}
                  onBurstDone={actions.burstDone}
                />
              );
            })}
          </div>

          {phase === "countdown" && (
            <div className="countdown-overlay" aria-live="assertive">
              {isTsugitashi && !everyoneHolding ? (
                <div className="countdown-num countdown-hold">HOLD YOUR BUTTONS!</div>
              ) : (
                <div className="countdown-num" key={countdown}>
                  {countdown > 0 ? countdown : "STRIKE!"}
                </div>
              )}
            </div>
          )}

          {phase === "results" && (
            <div className="results-action-bar">
              <div className="results-buttons">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={actions.returnToMenu}
                  aria-label="Return to Dojo"
                >
                  <img
                    src={getImageUrl("continue")}
                    alt=""
                    className="ghost-btn-img"
                  />
                </button>
              </div>
              <p className="hint">Press ENTER to return to the Dojo</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
