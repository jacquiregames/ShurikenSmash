import { memo, useCallback, useEffect, useState } from "react";
import { PlayerCardShell } from "../../shared/components/PlayerCardShell";
import { ResultBadge } from "../../shared/components/ResultBadge";
import { ShurikenZone } from "../../shared/components/ShurikenZone";
import { getBlindImageUrl, getBlindVideoUrl } from "../../shared/config/assets";
import type { Hit } from "../../shared/game/effects";
import type { Ninja, Outcome, PlayerResultInfo } from "../../shared/game/types";

interface BlindCardProps {
  player: Ninja;
  /** Seconds left when this player struck, once they have. */
  lockedTime?: number;
  pulseId: number;
  hits: readonly Hit[];
  isWinner?: boolean;
  result?: PlayerResultInfo;
  onVideoEnd: (playerId: number) => void;
  onHitDone: (playerId: number, hitId: number) => void;
}

export const BlindCard = memo(function BlindCard({
  player,
  lockedTime,
  pulseId,
  hits,
  isWinner,
  result,
  onVideoEnd,
  onHitDone,
}: BlindCardProps) {
  const isLocked = lockedTime !== undefined;
  const [videoDone, setVideoDone] = useState(false);

  // Reset when a new round starts or the player hasn't struck
  useEffect(() => {
    if (!isLocked) {
      setVideoDone(false);
    }
  }, [isLocked]);

  const handleVideoEnd = useCallback(
    (playerId: number) => {
      setVideoDone(true);
      onVideoEnd(playerId);
    },
    [onVideoEnd],
  );

  // Play /videos/blind/[color].mp4 when struck until the video ends or results appear
  const isPlayingHitVideo = isLocked && !videoDone && !result;
  const activeVideoUrl = isPlayingHitVideo ? getBlindVideoUrl(player.colorName) : undefined;

  // Background image state machine:
  // 1. Result screen: /images/blind/[color]-win.png or /images/blind/[color]-lose.png
  // 2. Video finished: /images/blind/[color]-hit.png
  // 3. Start/waiting: /images/blind/[color].png
  const winner = isWinner ?? (result?.rank === 1);
  let bgImage: string;
  if (result) {
    bgImage = getBlindImageUrl(winner ? `${player.colorName}-win` : `${player.colorName}-lose`);
  } else if (videoDone) {
    bgImage = getBlindImageUrl(`${player.colorName}-hit`);
  } else {
    bgImage = getBlindImageUrl(player.colorName);
  }

  const cardOutcome: Outcome | undefined = result ? (winner ? "win" : "lose") : undefined;

  return (
    <PlayerCardShell
      player={player}
      mode="blind"
      bgImage={bgImage}
      isLocked={isLocked}
      outcome={cardOutcome}
      videoUrl={activeVideoUrl}
      result={result}
      onVideoEnd={handleVideoEnd}
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