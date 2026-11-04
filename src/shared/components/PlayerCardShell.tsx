import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { getOutcomeImageUrl } from "../config/assets";
import type { GameMode, Ninja, Outcome, PlayerResultInfo } from "../game/types";

interface PlayerCardShellProps {
  player: Ninja;
  mode: GameMode;
  /** Explicit background image override (e.g. for Blind mode) */
  bgImage?: string;
  isLeading?: boolean;
  isLocked?: boolean;
  /** The player's button is currently held down (Tsugitashi). */
  keyHeld?: boolean;
  outcome?: Outcome;
  videoUrl?: string;
  result?: PlayerResultInfo;
  onVideoEnd: (playerId: number) => void;
  /** The card's contents. `hasVideo` is true while the outcome video is covering the card. */
  children: (hasVideo: boolean) => ReactNode;
}

/**
 * The frame every mode's player card shares: background art or outcome video, the
 * player's name and keycap. Each mode fills in the middle through `children`.
 */
export function PlayerCardShell({
  player,
  mode,
  bgImage: customBgImage,
  isLeading = false,
  isLocked = false,
  keyHeld = false,
  outcome,
  videoUrl,
  result,
  onVideoEnd,
  children,
}: PlayerCardShellProps) {
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

  const bgImage =
    customBgImage ?? (outcome ? getOutcomeImageUrl(player.colorName, outcome) : player.bgImage);
  const hasVideo = activeVideoUrl !== undefined;

  return (
    <div
      className={`card mode-${mode} ${isLeading ? "leading" : ""} ${isLocked ? "card-locked" : ""} ${
        outcome ? `outcome-${outcome}` : ""
      } ${hasVideo ? "has-video" : ""}`}
      style={{ "--c": player.color, "--g": player.glow } as CSSProperties}
    >
      {hasVideo ? (
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

      {children(hasVideo)}

      {!hasVideo && !result && (
        <kbd className={`big-key ${isLocked ? "key-disabled" : ""} ${keyHeld ? "key-held" : ""}`}>
          {player.key}
        </kbd>
      )}
    </div>
  );
}
