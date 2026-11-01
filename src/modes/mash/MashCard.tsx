import { memo } from "react";
import { PlayerCardShell } from "../../shared/components/PlayerCardShell";
import { ResultBadge } from "../../shared/components/ResultBadge";
import { ShurikenZone } from "../../shared/components/ShurikenZone";
import type { Hit } from "../../shared/game/effects";
import type { Ninja, Outcome, PlayerResultInfo } from "../../shared/game/types";

interface MashCardProps {
  player: Ninja;
  count: number;
  maxCount: number;
  isLeading: boolean;
  pulseId: number;
  hits: readonly Hit[];
  outcome?: Outcome;
  videoUrl?: string;
  result?: PlayerResultInfo;
  onVideoEnd: (playerId: number) => void;
  onHitDone: (playerId: number, hitId: number) => void;
}

export const MashCard = memo(function MashCard({
  player,
  count,
  maxCount,
  isLeading,
  pulseId,
  hits,
  outcome,
  videoUrl,
  result,
  onVideoEnd,
  onHitDone,
}: MashCardProps) {
  return (
    <PlayerCardShell
      player={player}
      mode="mash"
      isLeading={isLeading}
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
              hitLabel="+1"
              onHitDone={onHitDone}
            />
            <div className="count" key={`c${count}`}>
              {count}
            </div>
            <div className="power">
              <div className="power-fill" style={{ height: `${(count / maxCount) * 100}%` }} />
            </div>
          </>
        )
      }
    </PlayerCardShell>
  );
});
