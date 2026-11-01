import { previewTone } from "./audio";
import { setTone, useTone } from "./tone";
import { TONE_IDS, TONES } from "./tones";

/** Menu control for choosing Tsugitashi's sound set. Picking one plays a short sample. */
export function TsugitashiToneSelect() {
  const tone = useTone();
  return (
    <div className="tsugi-tone" role="group" aria-label="Tsugitashi sound">
      <span className="tsugi-tone-label">Sound</span>
      {TONE_IDS.map((id) => (
        <button
          type="button"
          key={id}
          className={`tsugi-tone-btn ${tone === id ? "selected" : ""}`}
          aria-pressed={tone === id}
          onClick={() => {
            setTone(id);
            previewTone();
          }}
        >
          {TONES[id].label}
        </button>
      ))}
    </div>
  );
}
