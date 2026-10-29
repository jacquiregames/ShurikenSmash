import { useMemo } from "react";
import { MODE_DETAILS, getOutcomeVideoUrl, getImageUrl } from "./game/config";
import { computeResults } from "./game/results";
import { WORDS } from "./game/wabun";
import { useGame } from "./hooks/useGame";
import { Timer } from "./components/Timer";
import { PlayerCard } from "./components/PlayerCard";
import { MenuPanel } from "./components/MenuPanel";
import { WabunChart } from "./components/WabunChart";
import { WabunProgress } from "./components/WabunProgress";
import { WordBanner } from "./components/WordBanner";
import { TsugitashiMeter } from "./components/TsugitashiMeter";
import { formatNumber } from "./game/tsugitashi";
import "./App.css";

export default function App() {
  const { state, clock, actions } = useGame();
  const {
    phase,
    mode,
    numPlayers,
    ninjas,
    countdown,
    counts,
    strikeTimes,
    pulses,
    hits,
    round,
    holder,
    hitSeq,
    knockouts,
    alive,
    wordIndex,
    progress,
    partials,
    pressedAt,
    mistakes,
    target,
    startedAt,
    roundMs,
  } = state;
  const word = WORDS[wordIndex];
  const { logoImage, title } = MODE_DETAILS[mode];
  const lastKnockout = knockouts.at(-1);

  const players = useMemo(() => ninjas.slice(0, numPlayers), [ninjas, numPlayers]);
  const isLastStanding = mode === "bakudan" && players.filter((p) => alive[p.id]).length === 1;
  const isRoundOver = phase === "video" || phase === "ended" || phase === "results";

  const results = useMemo(
    () =>
      isRoundOver
        ? computeResults({
            mode,
            players,
            counts,
            strikeTimes,
            knockouts,
            progress,
            wordLength: word.codes.length,
            target,
          })
        : null,
    [isRoundOver, mode, players, counts, strikeTimes, knockouts, progress, word, target]
  );

  const activeCounts = counts.slice(0, numPlayers);
  const topScore = Math.max(...activeCounts);
  const maxCount = Math.max(1, topScore);
  const leadersCount = activeCounts.filter((c) => c === topScore).length;

  return (
    <div className={`game phase-${phase} mode-${mode}`}>
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
          <Timer phase={phase} mode={mode} clock={clock} round={round} roundMs={roundMs} />

          {mode === "tsugitashi" && phase !== "countdown" && (
            <div className="tsugi-target">
              <span className="tsugi-target-label">Target</span>
              <span className="tsugi-target-value">{formatNumber(target)}</span>
            </div>
          )}

          {mode === "wabun" && (phase === "playing" || phase === "countdown") && (
            <div className="wabun-board">
              {phase === "playing" && <WordBanner word={word} />}
              <WabunChart />
            </div>
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

              const outcome = results ? (results.winnerIds.has(p.id) ? "win" : "lose") : undefined;
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
                  lockedTime={strikeTimes[p.id]}
                  isLocked={isLocked}
                  hasBomb={mode === "bakudan" && holder === p.id && !isLastStanding}
                  isVictor={isLastStanding && alive[p.id]}
                  bombKey={hitSeq}
                  knockout={knockouts.find((k) => k.playerId === p.id)}
                  isExploding={phase === "boom" && lastKnockout?.playerId === p.id}
                  playArea={
                    mode === "tsugitashi" && phase !== "countdown" ? (
                      <TsugitashiMeter
                        banked={counts[p.id]}
                        target={target}
                        pressedAt={phase === "playing" ? pressedAt[p.id] : undefined}
                        clock={clock}
                        startedAt={startedAt}
                        roundMs={roundMs}
                      />
                    ) : mode === "wabun" && phase !== "countdown" ? (
                      <WabunProgress
                        word={word}
                        sent={progress[p.id]}
                        partial={partials[p.id]}
                        pressedAt={pressedAt[p.id]}
                        mistakes={mistakes[p.id]}
                      />
                    ) : undefined
                  }
                  outcome={outcome}
                  videoUrl={videoUrl}
                  result={phase === "results" ? results?.byPlayer[p.id] : undefined}
                  onVideoEnd={actions.videoEnded}
                  onHitDone={actions.hitDone}
                />
              );
            })}
          </div>

          {phase === "countdown" && (
            <div className="countdown-overlay" aria-live="assertive">
              <div className="countdown-num" key={countdown}>
                {countdown > 0 ? countdown : "STRIKE!"}
              </div>
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
