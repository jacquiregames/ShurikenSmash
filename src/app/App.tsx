import { useMemo } from "react";
import { Backdrop } from "../shared/components/Backdrop";
import { MuteButton } from "../shared/components/MuteButton";
import { MusicButton } from "../shared/components/MusicButton";
import { getContinueButtonUrl, getCountdownImageUrl } from "../shared/config/assets";
import { preloadImages } from "../shared/preload";
import { modeMeta } from "../modes/registry";
import { GauntletResults } from "../modes/gauntlet/GauntletResults";
import { isLastGame } from "../modes/gauntlet/logic";
import { everyoneHolding } from "../modes/tsugitashi/logic";
import KunaiGame from "../modes/kunai/KunaiGame";
import { EscapeHint } from "./EscapeHint";
import { MenuPanel } from "./MenuPanel";
import { NextGameBanner } from "./NextGameBanner";
import { ModeCounter } from "./ModeCounter";
import { PlayerCards } from "./PlayerCards";
import { roundDuration } from "./reducer";
import { resultsFor } from "./results";
import { useGame } from "./useGame";
import "./App.css";

// Preload countdown numbers 1, 2, 3 so there is no decoding delay
preloadImages([1, 2, 3].map(getCountdownImageUrl));

export default function App() {
  const { state, clock, actions } = useGame();
  const { phase, mode, numPlayers, ninjas, countdown, gauntlet } = state;
  const { logoImage, title } = modeMeta(mode);
  const durationMs = roundDuration(state);

  const players = useMemo(() => ninjas.slice(0, numPlayers), [ninjas, numPlayers]);
  const isRoundOver = phase === "video" || phase === "ended" || phase === "results";

  const { mash, blind, stack, tsugitashi } = state;
  const mustHold = mode === "tsugitashi" && !everyoneHolding(tsugitashi, numPlayers);
  const results = useMemo(
    () =>
      isRoundOver ? resultsFor({ mode, ninjas, numPlayers, mash, blind, stack, tsugitashi }) : null,
    [isRoundOver, mode, ninjas, numPlayers, mash, blind, stack, tsugitashi],
  );

  // Between gauntlet games the logo gives way to the countdown to the next one
  const interlude =
    gauntlet && gauntlet.nextIn !== null ? (
      <NextGameBanner count={gauntlet.nextIn} isFinal={isLastGame(gauntlet)} />
    ) : null;

  // Kunai Bullseye is a self-contained game: it replaces the whole screen until players exit.
  if (phase === "kunai") {
    const kunai = modeMeta("kunai");
    return (
      <>
        <KunaiGame
          ninjas={players}
          logoSrc={kunai.logoImage ?? ""}
          logoAlt={kunai.title}
          onExit={actions.returnToMenu}
          inGauntlet={gauntlet !== null}
          onComplete={actions.kunaiFinished}
          logoSlot={interlude}
        />
        <EscapeHint armedAt={state.escapeArmedAt} />
      </>
    );
  }

  return (
    <div className={`game phase-${phase}`}>
      <Backdrop />
      <MuteButton />
      <MusicButton />

      {/* The standings table carries the gauntlet logo itself, so the finale has no header. */}
      {phase !== "finale" && (
        <header className="title-bar">
          <div className="title-bar-left">
            {interlude ??
              (logoImage ? (
                <img src={logoImage} alt={title} className="header-logo" />
              ) : (
                <h1 className="header-title">{title}</h1>
              ))}
          </div>

          {phase !== "menu" && (
            <div className="title-bar-center">
              <ModeCounter
                mode={mode}
                phase={phase}
                clock={clock}
                durationMs={durationMs}
                target={tsugitashi.target}
              />
            </div>
          )}
        </header>
      )}

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

      {phase === "finale" && gauntlet && (
        <div className="gauntlet-results">
          <GauntletResults
            players={players}
            logo={logoImage}
            logoAlt={title}
            games={gauntlet.games.map((id) => {
              const meta = modeMeta(id);
              return { id, title: meta.title, logo: meta.logoImage };
            })}
            run={gauntlet}
          />
          <div className="results-action-bar">
            <div className="results-buttons">
              <button
                type="button"
                className="ghost-btn"
                onClick={actions.returnToMenu}
                aria-label="Return to Dojo"
              >
                <img src={getContinueButtonUrl()} alt="" className="ghost-btn-img" />
              </button>
            </div>
          </div>
        </div>
      )}

      {phase !== "menu" && phase !== "finale" && (
        <>
          <PlayerCards state={state} results={results} actions={actions} />

          {/* The overlay goes the moment the "1" ends: the round starts right then. */}
          {phase === "countdown" && (countdown > 0 || mustHold) && (
            <div className="countdown-overlay" aria-live="assertive">
              {mustHold ? (
                <div className="countdown-num countdown-hold">HOLD YOUR BUTTONS!</div>
              ) : (
                <img
                  key={countdown}
                  src={getCountdownImageUrl(countdown)}
                  alt={String(countdown)}
                  className="countdown-img"
                  draggable={false}
                />
              )}
            </div>
          )}

          {phase === "results" && !gauntlet && (
            <div className="results-action-bar">
              <div className="results-buttons">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={actions.returnToMenu}
                  aria-label="Return to Dojo"
                >
                  <img src={getContinueButtonUrl()} alt="" className="ghost-btn-img" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {phase !== "menu" && <EscapeHint armedAt={state.escapeArmedAt} />}
    </div>
  );
}
