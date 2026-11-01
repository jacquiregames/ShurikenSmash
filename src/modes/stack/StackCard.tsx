import { memo } from "react";
import { PlayerCardShell } from "../../shared/components/PlayerCardShell";
import { ResultBadge } from "../../shared/components/ResultBadge";
import type { Ninja, PlayerResultInfo } from "../../shared/game/types";
import { StackField } from "./StackField";
import { StackStats } from "./StackStats";
import type { StackPlayer } from "./types";

interface StackCardProps {
  player: Ninja;
  tower: StackPlayer;
  pulseId: number;
  result?: PlayerResultInfo;
  onVideoEnd: (playerId: number) => void;
  onBurstDone: (playerId: number, burstId: number) => void;
}

export const StackCard = memo(function StackCard({
  player,
  tower,
  pulseId,
  result,
  onVideoEnd,
  onBurstDone,
}: StackCardProps) {
  return (
    <PlayerCardShell player={player} mode="stack" result={result} onVideoEnd={onVideoEnd}>
      {() => (
        <>
          <StackField
            playerId={player.id}
            stack={tower}
            pulseId={pulseId}
            onBurstDone={onBurstDone}
          />
          {result ? <ResultBadge result={result} compact /> : <StackStats rows={tower.rows} />}
        </>
      )}
    </PlayerCardShell>
  );
});
