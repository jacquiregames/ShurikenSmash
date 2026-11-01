import { useCallback, useMemo, useReducer, useState } from "react";
import { createClock } from "../shared/game/clock";
import type { GameMode, NinjaColor, PlayerCount } from "../shared/game/types";
import { roundMsFor } from "../modes/registry";
import { useStackTimer } from "../modes/stack/useStackTimer";
import { countBusts } from "../modes/tsugitashi/logic";
import { useTsugitashiAudio } from "../modes/tsugitashi/useTsugitashiAudio";
import { useKeyboard } from "./hooks/useKeyboard";
import { useOutcomePreload } from "./hooks/useOutcomePreload";
import { useRoundTimers } from "./hooks/useRoundTimers";
import { createInitialState, gameReducer, nextStackDue } from "./reducer";

export function useGame() {
  const [state, dispatch] = useReducer(gameReducer, undefined, createInitialState);
  const [clock] = useState(() => createClock(roundMsFor("mash")));

  const actions = useMemo(
    () => ({
      selectMode: (mode: GameMode) => dispatch({ type: "select_mode", mode }),
      selectPlayerCount: (count: PlayerCount) => dispatch({ type: "select_player_count", count }),
      selectColor: (playerId: number, color: NinjaColor) =>
        dispatch({ type: "select_color", playerId, color }),
      start: () => dispatch({ type: "start" }),
      returnToMenu: () => dispatch({ type: "return_to_menu" }),
      videoEnded: (playerId: number) => dispatch({ type: "video_ended", playerId }),
      hitDone: (playerId: number, hitId: number) => dispatch({ type: "hit_done", playerId, hitId }),
      burstDone: (playerId: number, burstId: number) =>
        dispatch({ type: "burst_done", playerId, burstId }),
    }),
    [],
  );

  const onStackTick = useCallback((at: number) => dispatch({ type: "stack_tick", at }), []);
  const isTsugitashi = state.mode === "tsugitashi";

  useKeyboard(dispatch);
  useOutcomePreload(state);
  useRoundTimers(state, dispatch, clock);
  useStackTimer(nextStackDue(state), onStackTick);
  useTsugitashiAudio(
    isTsugitashi,
    state.phase,
    isTsugitashi ? countBusts(state.tsugitashi, state.numPlayers) : 0,
  );

  return { state, clock, actions };
}

export type GameActions = ReturnType<typeof useGame>["actions"];
