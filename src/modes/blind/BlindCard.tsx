import { memo } from "react";
import { PlayerCardShell } from "../../shared/components/PlayerCardShell";
import { ResultBadge } from "../../shared/components/ResultBadge";
import { ShurikenZone } from "../../shared/components/ShurikenZone";
import type { Hit } from "../../shared/game/effects";
import type { Ninja, Outcome, PlayerResultInfo } from "../../shared/game/types";

interface BlindCardProps {
  player: Ninja;
  /** Seconds left when this player struck, once they have. */
  lockedTime?: number;
  pulseId: number;
  hits: readonly Hit[];
  outcome?: Outcome;
  videoUrl?: string;
  result?: PlayerResultInfo;
  onVideoEnd: (playerId: number) => void;
  onHitDone: (playerId: number, hitId: number) => void;
}

export const BlindCard = memo(function BlindCard({
  player,
  lockedTime,
  pulseId,
  hits,
  outcome,
  videoUrl,
  result,
  onVideoEnd,
  onHitDone,
}: BlindCardProps) {
  const isLocked = lockedTime !== undefined;
  return (
    <PlayerCardShell
      player={player}
      mode="blind"
      isLocked={isLocked}
      outcome={outcome}
      videoUrl={videoUrl}
      result={result}
      onVideoEnd={onVideoEnd}
    >
      {(hasVideo) =>
        result ? (
          <ResultBadge result={result} />
        ) : hasVideo ? null : (
          <>
            <ShurikenZone
              playerId={player.id}
              pulseId={pulseId}
              hits={hits}
              hitLabel="LOCKED"
              onHitDone={onHitDone}
            />
            <div className="count">
              {isLocked ? (
                <span className="locked-badge">LOCKED IN</span>
              ) : (
                <span className="waiting-badge">WAITING</span>
              )}
            </div>
            {isLocked && <div className="locked-time-preview">Struck!</div>}
          </>
        )
      }
    </PlayerCardShell>
  );
});
