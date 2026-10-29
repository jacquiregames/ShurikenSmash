import { memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { getOutcomeImageUrl } from "../game/config";
import type { Ninja, Hit, GameMode, Knockout, Outcome, PlayerResultInfo } from "../game/types";
import { Bomb } from "./Bomb";
import { Shuriken } from "./Shuriken";

interface PlayerCardProps {
  player: Ninja;
  mode: GameMode;
  count: number;
  maxCount: number;
  isLeading: boolean;
  pulseId: number;
  hits: readonly Hit[];
  lockedTime?: number;
  isLocked: boolean;
  /** Bakudan: holding the bomb right now. */
  hasBomb?: boolean;
  /** Bakudan: changes whenever the bomb moves, replaying its arrival animation. */
  bombKey?: number;
  /** Bakudan: set once this player is eliminated. */
  knockout?: Knockout;
  /** Bakudan: this player was just eliminated and the round is paused on it. */
  isExploding?: boolean;
  /** Bakudan: the last ninja standing. */
  isVictor?: boolean;
  outcome?: Outcome;
  videoUrl?: string;
  result?: PlayerResultInfo;
  onVideoEnd: (playerId: number) => void;
  onHitDone: (playerId: number, hitId: number) => void;
}

export const PlayerCard = memo(function PlayerCard({
  player,
  mode,
  count,
  maxCount,
  isLeading,
  pulseId,
  hits,
  lockedTime,
  isLocked,
  hasBomb = false,
  bombKey,
  knockout,
  isExploding = false,
  isVictor = false,
  outcome,
  videoUrl,
  result,
  onVideoEnd,
  onHitDone,
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
  const isOut = knockout !== undefined;
  const hitLabel = mode === "blind" ? "LOCKED" : mode === "bakudan" ? "PASS!" : "+1";

  return (
    <div
      className={`card ${isLeading ? "leading" : ""} ${isLocked ? "card-locked" : ""} ${
        hasBomb ? "card-holding" : ""
      } ${isOut && !outcome ? "card-out" : ""} ${isExploding ? `card-ko-${knockout?.cause}` : ""} ${
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
          <div className="card-kanji" aria-hidden="true">
            {player.kanji}
          </div>
        </>
      )}

      <div className="card-name">{player.name}</div>

      {result ? (
        <div className="card-result-badge">
          <img src={result.rankImage} alt={result.rankLabel} className="card-rank-img" />
          <div className="card-result-score">{result.scoreLabel}</div>
          {result.bonusImage && (
            <img src={result.bonusImage} alt="" className="card-bonus-img" />
          )}
        </div>
      ) : activeVideoUrl ? null : (
        <>
          <div className="shuriken-zone">
            {mode !== "bakudan" ? (
              <Shuriken pulseId={pulseId} />
            ) : hasBomb ? (
              <Bomb key={bombKey} />
            ) : null}
            {isExploding && knockout?.cause === "boom" && <div className="boom-burst" />}
            {hits.map((h) => (
              <div key={h.id} className="hit" style={{ left: `${h.x}%`, top: `${h.y}%` }}>
                <div className="slash" style={{ transform: `rotate(${h.rot}deg)` }} />
                <span className="plus" onAnimationEnd={() => onHitDone(player.id, h.id)}>
                  {hitLabel}
                </span>
              </div>
            ))}
          </div>

          <div className="count" key={`c${count}`}>
            {mode === "mash" ? (
              count
            ) : mode === "bakudan" ? (
              isOut ? (
                <span className="out-badge">{knockout?.cause === "boom" ? "BOOM!" : "FUMBLE!"}</span>
              ) : isVictor ? (
                <span className="victory-badge">VICTORY!</span>
              ) : hasBomb ? (
                <span className="holding-badge">PASS IT!</span>
              ) : (
                <span className="waiting-badge">READY</span>
              )
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
        <kbd className={`big-key ${isLocked || isOut ? "key-disabled" : ""}`}>{player.key}</kbd>
      )}
    </div>
  );
});
