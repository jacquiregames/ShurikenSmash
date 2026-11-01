import { memo } from "react";
import { PlayerCardShell } from "../../shared/components/PlayerCardShell";
import { ResultBadge } from "../../shared/components/ResultBadge";
import type { Ninja, Outcome, PlayerResultInfo } from "../../shared/game/types";
import { formatNumber, isBust } from "./tsugitashi";

interface TsugitashiCardProps {
  player: Ninja;
  held: boolean;
  /** Counter value they let go at. */
  locked?: number;
  target: number;
  pulseId: number;
  outcome?: Outcome;
  videoUrl?: string;
  result?: PlayerResultInfo;
  onVideoEnd: (playerId: number) => void;
}

export const TsugitashiCard = memo(function TsugitashiCard({
  player,
  held,
  locked,
  target,
  pulseId,
  outcome,
  videoUrl,
  result,
  onVideoEnd,
}: TsugitashiCardProps) {
  return (
    <PlayerCardShell
      player={player}
      mode="tsugitashi"
      keyHeld={held}
      outcome={outcome}
      videoUrl={videoUrl}
      result={result}
      onVideoEnd={onVideoEnd}
    >
      {(hasVideo) => {
        if (hasVideo) return null;
        // The number they locked (or BUST!) stays on the card when the results badge appears.
        const seat = (
          <div className="count tsugi-seat" key={`t${pulseId}`}>
            {locked !== undefined ? (
              isBust(locked, target) ? (
                <span className="tsugi-seat-bust">BUST!</span>
              ) : (
                <span className="locked-badge">{formatNumber(locked)}</span>
              )
            ) : held ? (
              <span className="locked-badge">HOLDING</span>
            ) : (
              <span className="waiting-badge">HOLD!</span>
            )}
          </div>
        );
        return result ? (
          <>
            {seat}
            <ResultBadge result={result} />
          </>
        ) : (
          seat
        );
      }}
    </PlayerCardShell>
  );
});
