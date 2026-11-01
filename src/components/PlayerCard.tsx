import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { getOutcomeImageUrl } from "../game/config";
import type { Ninja, Hit, GameMode, Outcome, PlayerResultInfo, StackPlayer } from "../game/types";
import { Shuriken } from "./Shuriken";
import { StackField } from "./StackField";
import { StackStats } from "./StackStats";
import { formatNumber, isBust } from "../game/tsugitashi";

/** A player's Tsugitashi button state. */
export interface TsugiSeat {
  held: boolean;
  /** Counter value they let go at. */
  locked?: number;
  target: number;
}

interface PlayerCardProps {
  player: Ninja;
  mode: GameMode;
  count: number;
  maxCount: number;
  isLeading: boolean;
  pulseId: number;
  hits: readonly Hit[];
  /** Tower state, used in Shinobi Stack mode. */
  stack?: StackPlayer;
  /** Button state, used in Tsugitashi mode. */
  tsugi?: TsugiSeat;
  lockedTime?: number;
  isLocked: boolean;
  outcome?: Outcome;
  videoUrl?: string;
  result?: PlayerResultInfo;
  onVideoEnd: (playerId: number) => void;
  onHitDone: (playerId: number, hitId: number) => void;
  onBurstDone: (playerId: number, burstId: number) => void;
}

export const PlayerCard = memo(function PlayerCard({
  player,
  mode,
  count,
  maxCount,
  isLeading,
  pulseId,
  hits,
  stack,
  tsugi,
  lockedTime,
  isLocked,
  outcome,
  videoUrl,
  result,
  onVideoEnd,
  onHitDone,
  onBurstDone,
}: PlayerCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failedVideoUrl, setFailedVideoUrl] = useState<string>();

  const activeVideoUrl = videoUrl && videoUrl !== failedVideoUrl ? videoUrl : undefined;

  useEffect(() => {
    const video = videoRef.current;
    if (!activeVideoUrl || !video) return;
    video.currentTime = 0;
    video.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        onVideoEnd(player.id);
      }
    });
  }, [activeVideoUrl, onVideoEnd, player.id]);

  const handleVideoError = () => {
    setFailedVideoUrl(videoUrl);
    onVideoEnd(player.id);
  };

  const bgImage = outcome ? getOutcomeImageUrl(player.colorName, outcome) : player.bgImage;

  const isStack = mode === "stack" && stack !== undefined;

  const resultBadge = result && (
    <div className={`card-result-badge ${isStack ? "compact" : ""}`}>
      <img src={result.rankImage} alt={result.rankLabel} className="card-rank-img" />
      <div className="card-result-score">{result.scoreLabel}</div>
      {result.bonusImage && <img src={result.bonusImage} alt="" className="card-bonus-img" />}
    </div>
  );

  return (
    <div
      className={`card mode-${mode} ${isLeading ? "leading" : ""} ${isLocked ? "card-locked" : ""} ${
        outcome ? `outcome-${outcome}` : ""
      } ${activeVideoUrl ? "has-video" : ""}`}
      style={{ "--c": player.color, "--g": player.glow } as CSSProperties}
    >
      {activeVideoUrl ? (
        <video
          ref={videoRef}
          key={activeVideoUrl}
          src={activeVideoUrl}
          autoPlay
          playsInline
          muted
          preload="auto"
          className="card-outcome-video"
          onEnded={() => onVideoEnd(player.id)}
          onError={handleVideoError}
        />
      ) : (
        <>
          <div className="card-bg-image" style={{ backgroundImage: `url("${bgImage}")` }} />
          <div className="card-overlay" />
        </>
      )}

      <div className="card-name">{player.name}</div>

      {isStack && stack ? (
        <>
          <StackField
            playerId={player.id}
            stack={stack}
            pulseId={pulseId}
            onBurstDone={onBurstDone}
          />
          {resultBadge ?? <StackStats rows={stack.rows} />}
        </>
      ) : result ? (
        resultBadge
      ) : activeVideoUrl ? null : tsugi ? (
        <div className="count tsugi-seat" key={`t${pulseId}`}>
          {tsugi.locked !== undefined ? (
            isBust(tsugi.locked, tsugi.target) ? (
              <span className="tsugi-seat-bust">BUST!</span>
            ) : (
              <span className="locked-badge">{formatNumber(tsugi.locked)}</span>
            )
          ) : tsugi.held ? (
            <span className="locked-badge">HOLDING</span>
          ) : (
            <span className="waiting-badge">HOLD!</span>
          )}
        </div>
      ) : (
        <>
          <div className="shuriken-zone">
            <Shuriken pulseId={pulseId} />
            {hits.map((h) => (
              <div key={h.id} className="hit" style={{ left: `${h.x}%`, top: `${h.y}%` }}>
                <div className="slash" style={{ transform: `rotate(${h.rot}deg)` }} />
                <span className="plus" onAnimationEnd={() => onHitDone(player.id, h.id)}>
                  {mode === "blind" ? "LOCKED" : "+1"}
                </span>
              </div>
            ))}
          </div>

          <div className="count" key={`c${count}`}>
            {mode === "mash" ? (
              count
            ) : isLocked ? (
              <span className="locked-badge">LOCKED IN</span>
            ) : (
              <span className="waiting-badge">WAITING</span>
            )}
          </div>

          {mode === "mash" && (
            <div className="power">
              <div className="power-fill" style={{ height: `${(count / maxCount) * 100}%` }} />
            </div>
          )}

          {mode === "blind" && lockedTime !== undefined && (
            <div className="locked-time-preview">Struck!</div>
          )}
        </>
      )}

      {!activeVideoUrl && !result && (
        <kbd className={`big-key ${isLocked ? "key-disabled" : ""} ${tsugi?.held ? "key-held" : ""}`}>
          {player.key}
        </kbd>
      )}
    </div>
  );
});
