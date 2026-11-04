import type { PlayerResultInfo } from "../game/types";

/** Rank art, score line and bonus art shown on a card once the round is scored. */
export function ResultBadge({ result }: { result: PlayerResultInfo }) {
  return (
    <div className="card-result-badge">
      <img src={result.rankImage} alt={result.rankLabel} className="card-rank-img" />
      <div className="card-result-score">{result.scoreLabel}</div>
      {result.bonusImage && <img src={result.bonusImage} alt="" className="card-bonus-img" />}
    </div>
  );
}
