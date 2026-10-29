import { memo } from "react";
import { CHART_COLUMNS, DAKUTEN, HANDAKUTEN } from "../game/wabun";
import { Morse } from "./Morse";

/** Reference chart: one column per consonant row (A, KA, SA…), vowels a/i/u/e/o down. */
export const WabunChart = memo(function WabunChart() {
  return (
    <div className="wabun-chart" aria-label="Wabun code reference chart">
      <div className="wabun-grid">
        {CHART_COLUMNS.map((column) => (
          <div key={column[0]?.romaji} className="wabun-col">
            {column.map((kana, row) =>
              kana ? (
                <div key={kana.romaji} className="wabun-cell">
                  <span className="wabun-kana">{kana.kana}</span>
                  <span className="wabun-romaji">{kana.romaji}</span>
                  <Morse code={kana.code} />
                </div>
              ) : (
                <div key={`empty-${row}`} className="wabun-cell wabun-empty" aria-hidden="true" />
              )
            )}
          </div>
        ))}
      </div>

      <div className="wabun-marks">
        <div className="wabun-mark">
          <span className="wabun-mark-name">Dakuten</span>
          <Morse code={DAKUTEN.code} />
          <span className="wabun-mark-hint">after KA → GA · SHI → JI · HA → BA</span>
        </div>
        <div className="wabun-mark">
          <span className="wabun-mark-name">Handakuten</span>
          <Morse code={HANDAKUTEN.code} />
          <span className="wabun-mark-hint">after HA → PA</span>
        </div>
        <div className="wabun-mark wabun-legend">
          <Morse code="." /> tap <Morse code="-" /> hold
        </div>
      </div>
    </div>
  );
});
