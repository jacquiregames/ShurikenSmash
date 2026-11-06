import type { CSSProperties } from "react";
import {
  getBonusImageUrl,
  getGauntletCrownUrl,
  getGauntletTotalUrl,
  getRankImageUrl,
  getTotalImageUrl,
} from "../../shared/config/assets";
import { bonusTierFor, competitionRank } from "../../shared/game/ranking";
import type { GameMode, Ninja } from "../../shared/game/types";
import { gauntletTotals, type GauntletRun } from "./logic";

export interface GauntletGameHeader {
  id: GameMode;
  title: string;
  logo?: string;
}

interface GauntletResultsProps {
  players: readonly Ninja[];
  /** The Ninja Gauntlet logo, shown in the table's top-left cell. */
  logo?: string;
  logoAlt: string;
  /** One entry per game, in play order: the column headers. */
  games: readonly GauntletGameHeader[];
  run: Pick<GauntletRun, "ranks">;
}

/** The Ninja Gauntlet standings: one row per ninja, the bonus each game paid, and the total. */
export function GauntletResults({ players, logo, logoAlt, games, run }: GauntletResultsProps) {
  const totals = gauntletTotals(run, players.length);
  const rows = players
    .map((player, seat) => ({
      player,
      seat,
      total: totals[seat],
      rank: competitionRank(totals, totals[seat], (a, b) => a > b),
    }))
    .sort((a, b) => a.rank - b.rank || a.seat - b.seat);

  return (
    <table className="gauntlet-table">
      <thead>
        <tr>
          <th scope="col" className="gauntlet-logo-cell">
            {logo ? (
              <img src={logo} alt={logoAlt} className="gauntlet-title-logo" />
            ) : (
              <span className="gauntlet-sr-only">Ninja</span>
            )}
          </th>
          {games.map((game) => (
            <th scope="col" key={game.id}>
              {game.logo ? (
                <img src={game.logo} alt={game.title} className="gauntlet-game-logo" />
              ) : (
                game.title
              )}
            </th>
          ))}
          <th scope="col" className="gauntlet-total-head">
            <img src={getGauntletTotalUrl()} alt="Total" className="gauntlet-game-logo" />
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ player, seat, total, rank }) => (
          <tr
            key={player.id}
            className={rank === 1 ? "is-champion" : undefined}
            style={{ "--c": player.color } as CSSProperties}
          >
            <th scope="row">
              <div className="gauntlet-ninja">
                {/* every row keeps the crown's slot, so the rank images line up */}
                <span className="gauntlet-crown-slot">
                  {rank === 1 && (
                    <img src={getGauntletCrownUrl()} alt="Champion" className="gauntlet-crown" />
                  )}
                </span>
                <img src={getRankImageUrl(rank)} alt={`Rank ${rank}`} className="gauntlet-rank" />
                <span className="gauntlet-name">{player.name}</span>
              </div>
            </th>
            {games.map((game, g) => {
              const placed = run.ranks[g];
              return (
                <td key={game.id}>
                  {placed ? (
                    <img
                      src={getBonusImageUrl(bonusTierFor(placed[seat] ?? null, players.length))}
                      alt=""
                      className="gauntlet-bonus"
                    />
                  ) : (
                    "–"
                  )}
                </td>
              );
            })}
            <td className="gauntlet-total">
              <img
                src={getTotalImageUrl(total)}
                alt={String(total)}
                className="gauntlet-total-img"
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
