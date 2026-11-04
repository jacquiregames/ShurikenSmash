import { useMemo } from "react";
import { Backdrop } from "../shared/components/Backdrop";
import { MuteButton } from "../shared/components/MuteButton";
import { getImageUrl } from "../shared/config/assets";
import { modeMeta } from "../modes/registry";
import KunaiGame from "../modes/kunai/KunaiGame";
import { MenuPanel } from "./MenuPanel";
import { ModeCounter } from "./ModeCounter";
import { PlayerCards } from "./PlayerCards";
import { roundDuration } from "./reducer";
import { computeResults } from "./results";
import { useGame } from "./useGame";
import "./App.css";

export default function App() {
  const { state, clock, actions } = useGame();
  const { phase, mode, numPlayers, ninjas, countdown } = state;
  const { logoImage, title } = modeMeta(mode);
  const durationMs = roundDuration(state);
  const everyoneHolding = state.tsugitashi.held.slice(0, numPlayers).every(Boolean);

  const players = useMemo(() => ninjas.slice(0, numPlayers), [ninjas, numPlayers]);
  const isRoundOver = phase === "video" || phase === "ended" || phase === "results";

  const { mash, blind, stack, tsugitashi } = state;
  const results = useMemo(
    () =>
      isRoundOver
        ? computeResults({
            mode,
            players,
            counts: mash.counts,
            strikeTimes: blind.strikeTimes,
            stacks: stack.towers,
            target: tsugitashi.target,
            locked: tsugitashi.locked,
          })
        : null,
    [isRoundOver, mode, players, mash, blind, stack, tsugitashi],
  );

  // Kunai Bullseye is a self-contained game: it replaces the whole screen until players exit.
  if (phase === "kunai") {
    const kunai = modeMeta("kunai");
    return (
      <KunaiGame
        ninjas={players}
        logoSrc={kunai.logoImage ?? ""}
        logoAlt={kunai.title}
        onExit={actions.returnToMenu}
      />
    );
  }

  return (
    <div className={`game phase-${phase}`}>
      <Backdrop />
      <MuteButton />

      <header className="title-bar">
        <div className="title-bar-left">
          {logoImage ? (
            <img src={logoImage} alt={title} className="header-logo" />
          ) : (
            <h1 className="header-title">{title}</h1>
          )}
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
          <PlayerCards state={state} results={results} actions={actions} />

          {phase === "countdown" && (
            <div className="countdown-overlay" aria-live="assertive">
              {mode === "tsugitashi" && !everyoneHolding ? (
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
                  <img src={getImageUrl("continue")} alt="" className="ghost-btn-img" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
