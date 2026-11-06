import { toggleMusic } from "../audio/music";
import { useMusicOn } from "../audio/useMusic";
import { MusicOff, MusicOn } from "./icons";

/** Corner button, beside the mute button, that switches the background music on and off. */
export function MusicButton() {
  const on = useMusicOn();
  return (
    <button
      type="button"
      className={`mute-btn music-btn ${on ? "" : "off"}`}
      onClick={toggleMusic}
      title={on ? "Turn music off" : "Turn music on"}
      aria-label={on ? "Turn music off" : "Turn music on"}
      aria-pressed={!on}
    >
      {on ? <MusicOn /> : <MusicOff />}
    </button>
  );
}
