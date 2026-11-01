import { toggleMuted } from "../audio/context";
import { useMuted } from "../audio/useMuted";
import { SoundOff, SoundOn } from "./icons";

/** Corner button for the app-wide mute (the M key does the same). */
export function MuteButton() {
  const muted = useMuted();
  return (
    <button
      type="button"
      className={`mute-btn ${muted ? "off" : ""}`}
      onClick={toggleMuted}
      title={muted ? "Unmute sound (M)" : "Mute sound (M)"}
      aria-label={muted ? "Unmute sound" : "Mute sound"}
      aria-pressed={muted}
    >
      {muted ? <SoundOff /> : <SoundOn />}
    </button>
  );
}
