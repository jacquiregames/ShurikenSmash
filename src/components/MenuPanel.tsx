import type { CSSProperties } from "react";
import { MODE_DETAILS, AVAILABLE_COLORS, COLOR_OPTIONS, PLAYER_COUNTS, getImageUrl, getRewardImageUrl } from "../game/config";
import type { Ninja, NinjaColor, GameMode, PlayerCount } from "../game/types";

interface MenuPanelProps {
  mode: GameMode;
  numPlayers: PlayerCount;
  players: readonly Ninja[];
  onSelectMode: (mode: GameMode) => void;
  onSelectNumPlayers: (count: PlayerCount) => void;
  onSelectPlayerColor: (playerId: number, color: NinjaColor) => void;
  onStartGame: () => void;
}

export function MenuPanel({
  mode,
  numPlayers,
  players,
  onSelectMode,
  onSelectNumPlayers,
  onSelectPlayerColor,
  onStartGame,
}: MenuPanelProps) {
  return (
    <div className="menu panel">
      <div className="mode-tabs" role="group" aria-label="Game mode">
        <button
          type="button"
          className={`tab-btn ${mode === "mash" ? "active" : ""}`}
          aria-pressed={mode === "mash"}
          onClick={() => onSelectMode("mash")}
        >
          ⚔ Shuriken Smash (Mash)
        </button>
        <button
          type="button"
          className={`tab-btn ${mode === "blind" ? "active" : ""}`}
          aria-pressed={mode === "blind"}
          onClick={() => onSelectMode("blind")}
        >
          ⏱ Shadow Strike (Blind 10s)
        </button>
        <button
          type="button"
          className={`tab-btn ${mode === "bakudan" ? "active" : ""}`}
          aria-pressed={mode === "bakudan"}
          onClick={() => onSelectMode("bakudan")}
        >
          💣 Bakudan (Hot Potato)
        </button>
        <button
          type="button"
          className={`tab-btn ${mode === "wabun" ? "active" : ""}`}
          aria-pressed={mode === "wabun"}
          onClick={() => onSelectMode("wabun")}
        >
          🍣 Wabun (Morse Race)
        </button>
        <button
          type="button"
          className={`tab-btn ${mode === "tsugitashi" ? "active" : ""}`}
          aria-pressed={mode === "tsugitashi"}
          onClick={() => onSelectMode("tsugitashi")}
        >
          ➕ Tsugitashi (Don't Go Over)
        </button>
      </div>

      <div className="menu-interactive-section">
        <div className="rules-image-container">
          {MODE_DETAILS[mode].rulesImage ? (
            <img
              src={MODE_DETAILS[mode].rulesImage}
              alt={`${MODE_DETAILS[mode].title} Rules`}
              className="rules-image"
            />
          ) : (
            <div className="rules-text">
              <h2>{MODE_DETAILS[mode].title}</h2>
              <ol>
                {MODE_DETAILS[mode].rules?.map((rule) => <li key={rule}>{rule}</li>)}
              </ol>
            </div>
          )}
          <img
            src={getRewardImageUrl(numPlayers)}
            alt="Battle Rewards"
            className="reward-image"
          />
        </div>

        <div className="menu-player-setup">
          <div className="player-select" role="group" aria-label="Number of ninjas">
            {PLAYER_COUNTS.map((n) => (
              <button
                type="button"
                key={n}
                className={`select-btn ${numPlayers === n ? "selected" : ""}`}
                aria-pressed={numPlayers === n}
                onClick={() => onSelectNumPlayers(n)}
              >
                <span className="select-num">{n}</span>
                <span className="select-label">Ninjas</span>
              </button>
            ))}
          </div>

          <div className="player-roster">
            {players.map((p) => (
              <div
                key={p.id}
                className="player-config-card"
                style={{ "--c": p.color, "--g": p.glow } as CSSProperties}
              >
                <div className="player-card-header">
                  <kbd>{p.key}</kbd>
                  <span className="player-label">{p.name}</span>
                </div>

                <div className="color-palette" role="group" aria-label={`${p.name} color`}>
                  {AVAILABLE_COLORS.map((cName) => {
                    const opt = COLOR_OPTIONS[cName];
                    const isSelected = p.colorName === cName;
                    return (
                      <button
                        type="button"
                        key={cName}
                        title={opt.label}
                        aria-label={`${opt.label} for ${p.name}`}
                        aria-pressed={isSelected}
                        className={`swatch-btn ${isSelected ? "selected" : ""}`}
                        style={{ backgroundColor: opt.color }}
                        onClick={() => onSelectPlayerColor(p.id, cName)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        className="start-btn"
        onClick={onStartGame}
        aria-label="Begin Battle"
      >
        <img
          src={getImageUrl("begin")}
          alt=""
          className="start-btn-img"
        />
      </button>
      <p className="hint">
        Press ENTER to start · 3 / 4 to choose players · ESC quits a round
      </p>
      <p className="hint hint-small">
        Picking a color another ninja wears swaps the two. Budget keyboards may drop
        simultaneous key presses.
      </p>
    </div>
  );
}
