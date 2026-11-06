import type { CSSProperties } from "react";
import { AVAILABLE_COLORS, COLOR_OPTIONS } from "../shared/config/colors";
import {
  getBeginButtonUrl,
  getPlayerCountImageUrl, 
} from "../shared/config/assets";
import { PLAYER_COUNTS } from "../shared/config/players";
import type { GameMode, Ninja, NinjaColor, PlayerCount } from "../shared/game/types";
import { GAUNTLET_GAMES } from "../modes/gauntlet/logic";
import { MODES, modeMeta } from "../modes/registry";
import { TsugitashiToneSelect } from "../modes/tsugitashi/TsugitashiToneSelect";

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
  const { title, rulesImage, rules } = modeMeta(mode);
  return (
    <div className="menu panel">
      <div className="mode-tabs" role="group" aria-label="Game mode">
        {MODES.map((m) => (
          <button
            type="button"
            key={m.id}
            className={`tab-btn ${mode === m.id ? "active" : ""}`}
            aria-pressed={mode === m.id}
            onClick={() => onSelectMode(m.id)}
          >
            {m.id === "gauntlet" ? (
              // the gauntlet plays every other game, so its tab shows all of their icons
              <span className="tab-btn-icons">
                {GAUNTLET_GAMES.map((g) => (
                  <img
                    key={g}
                    src={modeMeta(g).menuIcon}
                    alt=""
                    className="tab-btn-icon"
                    draggable={false}
                  />
                ))}
              </span>
            ) : (
              m.menuIcon && (
                <img src={m.menuIcon} alt="" className="tab-btn-icon" draggable={false} />
              )
            )}
            <span className="tab-btn-label">{m.menuLabel}</span>
          </button>
        ))}
      </div>

      <div className="menu-interactive-section">
        <div className="rules-image-container">
          {rulesImage ? (
            <img src={rulesImage} alt={`${title} Rules`} className="rules-image" />
          ) : (
            <ol className="rules-text">
              {rules?.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ol>
          )} 
        </div>

        <div className="menu-player-setup">
          <div className="player-select" role="group" aria-label="Number of ninjas">
            {PLAYER_COUNTS.map((n) => (
              <button
                type="button"
                key={n}
                className={`select-btn ${numPlayers === n ? "selected" : ""}`}
                aria-pressed={numPlayers === n}
                aria-label={`${n} ninjas`}
                onClick={() => onSelectNumPlayers(n)}
              >
                <img
                  src={getPlayerCountImageUrl(n)}
                  alt=""
                  className="select-img"
                  draggable={false}
                />
              </button>
            ))}
          </div>

          {(mode === "tsugitashi" || mode === "gauntlet") && <TsugitashiToneSelect />}

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

      <button type="button" className="start-btn" onClick={onStartGame} aria-label="Begin Battle">
        <img src={getBeginButtonUrl()} alt="" className="start-btn-img" />
      </button>
    </div>
  );
}
