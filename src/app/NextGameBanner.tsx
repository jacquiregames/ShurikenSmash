import { getGauntletCountdownImageUrl } from "../shared/config/assets";

interface NextGameBannerProps {
  /** Seconds left, 5 down to 1. */
  count: number;
  /** After the last game the countdown leads to the standings, not another game. */
  isFinal: boolean;
}

/** Stands in for the game logo between gauntlet games: "Next Game Starts in 5 … 1". */
export function NextGameBanner({ count, isFinal }: NextGameBannerProps) {
  return (
    <div className="next-game" role="timer" aria-live="polite">
      <span className="next-game-label">
        {isFinal ? "Final Results in " : "Next Game Starts in "}
      </span>
      <img
        key={count}
        src={getGauntletCountdownImageUrl(count)}
        alt={String(count)}
        className="next-game-num"
        draggable={false}
      />
    </div>
  );
}
