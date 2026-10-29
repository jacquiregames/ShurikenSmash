import { memo, type CSSProperties } from "react";
import { WABUN_DASH_MS } from "../game/config";
import type { Word } from "../game/wabun";
import { Morse } from "./Morse";

interface WabunProgressProps {
  word: Word;
  /** Morse characters sent correctly so far. */
  sent: number;
  /** Dots and dashes of the character in progress. */
  partial: string;
  /** When the button went down, while it is held. */
  pressedAt?: number;
  mistakes: number;
}

/** One player's spelling progress: finished syllables lit, the current one showing their keying. */
export const WabunProgress = memo(function WabunProgress({
  word,
  sent,
  partial,
  pressedAt,
  mistakes,
}: WabunProgressProps) {
  let start = 0;
  const chips = word.syllables.map((s) => {
    const first = start;
    start += s.codes.length;
    const state = sent >= start ? "done" : sent >= first ? "current" : "todo";
    return { s, state, halfDone: state === "current" && sent > first };
  });

  return (
    <div className="wabun-progress">
      <div className="wabun-chips">
        {chips.map(({ s, state, halfDone }, i) => (
          <div key={i} className={`wabun-chip chip-${state} ${halfDone ? "chip-half" : ""}`}>
            <span className="wabun-chip-kana">{s.kana}</span>
            <span className="wabun-chip-romaji">{s.romaji}</span>
          </div>
        ))}
      </div>

      <div className="wabun-keying">
        <Morse code={partial} className="wabun-partial" />
        {pressedAt !== undefined && (
          // Remounted per press so the fill restarts; it turns into a dash once held long enough.
          <span
            key={pressedAt}
            className="wabun-hold"
            style={{ "--dash-ms": `${WABUN_DASH_MS}ms` } as CSSProperties}
          />
        )}
      </div>

      {mistakes > 0 && (
        <div key={mistakes} className="wabun-reset">
          RESET!
        </div>
      )}
    </div>
  );
});
