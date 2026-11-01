import { memo } from "react";
import {
  SPEED_TIERS,
  STACK_ROWS,
  rankForRows,
  speedPercent,
  speedTier,
} from "../game/stack";
import type { Row } from "../game/types";

/** Height / rank / speed read-outs under a player's tower. */
export const StackStats = memo(function StackStats({ rows }: { rows: readonly Row[] }) {
  const height = rows.length;
  const pct = speedPercent(height);
  const tier = speedTier(pct);

  return (
    <div className="stack-stats">
      <div className="stack-stat">
        <span className="stack-stat-label">HEIGHT</span>
        <span className="stack-stat-value">
          {height}/{STACK_ROWS}
        </span>
      </div>
      <div className="stack-stat">
        <span className="stack-stat-label">RANK</span>
        <span className="stack-stat-value rank">{rankForRows(height)}</span>
      </div>
      <div className="stack-stat">
        <span className="stack-stat-label">SPEED</span>
        <span className={`stack-stat-value speed tier-${tier}`}>
          {SPEED_TIERS[tier].en}
        </span>
      </div>
      <div className="stack-gauge">
        <div className="stack-gauge-fill" style={{ width: `${Math.max(4, pct)}%` }} />
      </div>
    </div>
  );
});
