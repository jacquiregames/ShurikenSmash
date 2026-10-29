import { memo } from "react";
import type { Word } from "../game/wabun";

/** The sushi word everyone is racing to spell. */
export const WordBanner = memo(function WordBanner({ word }: { word: Word }) {
  return (
    <div className="word-banner">
      <div className="word-syllables">
        {word.syllables.map((s, i) => (
          <div key={i} className="word-syllable">
            <span className="word-kana">{s.kana}</span>
            <span className="word-romaji">{s.romaji}</span>
          </div>
        ))}
      </div>
      <div className="word-english">{word.english}</div>
    </div>
  );
});
