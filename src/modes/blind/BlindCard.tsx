import { memo, useCallback, useState } from "react";
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
  const hasResult = result !== undefined;
  const [hitVideoDone, setHitVideoDone] = useState(false);
  const [winVideoDone, setWinVideoDone] = useState(false);

  // A new round clears the hit video; leaving the results clears the win video. Resetting
  // while rendering (rather than in an effect) avoids painting one frame of stale state.
  const [wasLocked, setWasLocked] = useState(isLocked);
  if (wasLocked !== isLocked) {
    setWasLocked(isLocked);
    if (!isLocked) {
      setHitVideoDone(false);
      setWinVideoDone(false);
    }
  }
  const [hadResult, setHadResult] = useState(hasResult);
  if (hadResult !== hasResult) {
    setHadResult(hasResult);
    if (!hasResult) setWinVideoDone(false);
  }

  const winner = isWinner ?? result?.rank === 1;

  // Video playback logic:
  // 1. Hit video: plays when struck during the round until it ends
  const isPlayingHitVideo = isLocked && !hitVideoDone && !result;
  // 2. Win video: only for the winner once results appear, until it finishes
  const isPlayingWinVideo = Boolean(result && winner && !winVideoDone);

  const activeVideoUrl = isPlayingHitVideo
    ? getBlindVideoUrl(player.colorName)
    : isPlayingWinVideo
      ? getBlindVideoUrl(`${player.colorName}-win`)
      : undefined;

  const handleVideoEnd = useCallback(
    (playerId: number) => {
      if (result) {
        // Winner's win video finished
        setWinVideoDone(true);
      } else {
        // Hit video finished
        setHitVideoDone(true);
        onVideoEnd(playerId);
      }
    },
    [result, onVideoEnd],
  );

  // Background image state machine:
  // 1. Result screen:
  //    - Loser: [color]-lose.png
  //    - Winner: [color]-win.png (once win video finishes, or fallback)
  // 2. During round:
  //    - Struck & hit video finished: [color]-hit.png
  //    - Waiting / initial: [color].png
  let bgImage: string;
  if (result) {
    bgImage = getBlindImageUrl(winner ? `${player.colorName}-win` : `${player.colorName}-lose`);
  } else if (hitVideoDone) {
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
