import type { RoundResults } from "../shared/game/ranking";
import type { Outcome } from "../shared/game/types";
import { getOutcomeVideoUrl } from "../shared/config/assets";
import { BlindCard } from "../modes/blind/BlindCard";
import { MashCard } from "../modes/mash/MashCard";
import { mashStandings } from "../modes/mash/logic";
import { usesOutcomeMedia } from "../modes/registry";
import { StackCard } from "../modes/stack/StackCard";
import { TsugitashiCard } from "../modes/tsugitashi/TsugitashiCard";
import type { GameActions } from "./useGame";
import type { GameState } from "./state";

interface PlayerCardsProps {
  state: GameState;
  /** Scores for the finished round; `null` while it is still being played. */
  results: RoundResults | null;
  actions: GameActions;
}

/** The row of player cards: the one place that maps a mode to its card component. */
export function PlayerCards({ state, results, actions }: PlayerCardsProps) {
  const { phase, mode, numPlayers, ninjas, pulses, hits } = state;
  const { topScore, maxCount, leaderCount } = mashStandings(state.mash.counts, numPlayers);

  return (
    <div className={`arena players-${numPlayers}`}>
      {ninjas.slice(0, numPlayers).map((p) => {
        const common = {
          player: p,
          pulseId: pulses[p.id],
          result: phase === "results" ? results?.byPlayer[p.id] : undefined,
          onVideoEnd: actions.videoEnded,
        };
        const outcome: Outcome | undefined =
          results && usesOutcomeMedia(mode)
            ? results.winnerIds.has(p.id)
              ? "win"
              : "lose"
            : undefined;
        const videoUrl =
          phase === "video" && outcome ? getOutcomeVideoUrl(p.colorName, outcome) : undefined;
        const media = { ...common, outcome, videoUrl };

        switch (mode) {
          case "mash": {
            const count = state.mash.counts[p.id];
            return (
              <MashCard
                key={p.id}
                {...media}
                count={count}
                maxCount={maxCount}
                isLeading={
                  phase === "playing" && count > 0 && count === topScore && leaderCount === 1
                }
                hits={hits[p.id]}
                onHitDone={actions.hitDone}
              />
            );
          }
          case "blind":
            return (
              <BlindCard
                key={p.id}
                player={p}
                lockedTime={state.blind.strikeTimes[p.id]}
                pulseId={pulses[p.id]}
                hits={hits[p.id]}
                isWinner={results ? results.winnerIds.has(p.id) : undefined}
                result={phase === "results" ? results?.byPlayer[p.id] : undefined}
                onVideoEnd={actions.videoEnded}
                onHitDone={actions.hitDone}
              />
            );
          case "stack":
            return (
              <StackCard
                key={p.id}
                {...common}
                tower={state.stack.towers[p.id]}
                onBurstDone={actions.burstDone}
              />
            );
          case "tsugitashi":
            return (
              <TsugitashiCard
                key={p.id}
                {...media}
                held={state.tsugitashi.held[p.id]}
                locked={state.tsugitashi.locked[p.id]}
                target={state.tsugitashi.target}
              />
            );
          case "kunai":
          case "gauntlet":
            return null; // Kunai replaces the whole screen; the gauntlet always shows its current game
        }
      })}
    </div>
  );
}
