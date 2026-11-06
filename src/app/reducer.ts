import { COUNTDOWN_START, ESCAPE_CONFIRM_MS, RESULTS_INPUT_LOCK_MS } from "../shared/config/timing";
import { MAX_PLAYERS } from "../shared/config/players";
import { filled, replaceAt } from "../shared/game/collections";
import { addHit, bumpPulse, removeHit, type Hit } from "../shared/game/effects";
import { DEFAULT_NINJAS, assignColor } from "../shared/game/ninjas";
import type { GameMode, NinjaColor, PlayerCount } from "../shared/game/types";
import { blindStrike, everyoneStruck, hasStruck, initialBlindRound } from "../modes/blind/logic";
import { initialMashRound, mashStrike } from "../modes/mash/logic";
import { roundMsFor, usesOutcomeMedia } from "../modes/registry";
import {
  advanceTowers,
  delayTowers,
  dropBlock,
  everyoneDone,
  initialStackRound,
  nextTowerDue,
  removeBurst,
  startTowers,
} from "../modes/stack/logic";
import {
  bustHolders,
  drawTarget,
  everyoneHolding,
  everyoneLocked,
  initialTsugiRound,
  lockIn,
  setHeld,
} from "../modes/tsugitashi/logic";
import { initialGauntlet, isLastGame, recordGame } from "../modes/gauntlet/logic";
import { bustMs } from "../modes/tsugitashi/tsugitashi";
import { resultsFor } from "./results";
import type { GameState } from "./state";

export type { GameState } from "./state";

export type GameAction =
  | { type: "select_mode"; mode: GameMode }
  | { type: "select_player_count"; count: PlayerCount }
  | { type: "select_color"; playerId: number; color: NinjaColor }
  | { type: "start" }
  | { type: "countdown_tick" }
  /** `random` in [0, 1) picks the Tsugitashi target; it arrives with the action to keep the reducer pure. */
  | { type: "begin_play"; at: number; random?: number }
  | { type: "time_up" }
  /** The first frame of play reached the screen; the round clock starts from here, not from the state change. */
  | { type: "play_painted"; at: number }
  | { type: "video_ended"; playerId: number }
  | { type: "video_timeout" }
  | { type: "show_results"; at: number }
  | { type: "hit_done"; playerId: number; hitId: number }
  | { type: "stack_tick"; at: number }
  | { type: "burst_done"; playerId: number; burstId: number }
  | { type: "return_to_menu" }
  | { type: "key_down"; code: string; at: number }
  | { type: "key_up"; code: string; at: number }
  /** The window lost focus, so any held button will never report its release. */
  | { type: "release_all"; at: number }
  /** One second of the Ninja Gauntlet's between-games countdown has passed. */
  | { type: "gauntlet_tick"; at: number }
  /** Kunai Bullseye finished its match inside a gauntlet; `ranks` is indexed by seat. */
  | { type: "kunai_finished"; ranks: readonly (number | null)[] };

const CONFIRM_CODES = new Set(["Enter", "NumpadEnter", "Space"]);
const PLAYER_COUNT_CODES: Record<string, PlayerCount> = {
  Digit3: 3,
  Numpad3: 3,
  Digit4: 4,
  Numpad4: 4,
};

/** Fresh per-round state for every mode. */
function roundState() {
  return {
    startedAt: null,
    playSynced: false,
    pulses: filled(0),
    hits: Array.from({ length: MAX_PLAYERS }, (): Hit[] => []),
    videosDone: filled(false),
    resultsShownAt: 0,
    escapeArmedAt: null,
    mash: initialMashRound(),
    blind: initialBlindRound(),
    stack: initialStackRound(),
    tsugitashi: initialTsugiRound(),
  };
}

export function createInitialState(): GameState {
  return {
    phase: "menu",
    mode: "mash",
    numPlayers: 4,
    ninjas: DEFAULT_NINJAS,
    gauntlet: null,
    countdown: COUNTDOWN_START,
    seq: 0,
    ...roundState(),
  };
}

/** How long the round runs: Tsugitashi ends the moment the counter passes the target. */
export function roundDuration(state: Pick<GameState, "mode" | "tsugitashi">): number {
  return state.mode === "tsugitashi" ? bustMs(state.tsugitashi.target) : roundMsFor(state.mode);
}

/** When the next stack block is due to move (`null` if nothing is moving). */
export function nextStackDue(state: GameState): number | null {
  if (state.phase !== "playing" || state.mode !== "stack") return null;
  return nextTowerDue(state.stack, state.numPlayers);
}

const activePlayers = (state: GameState) => state.ninjas.slice(0, state.numPlayers);
const seatOf = (state: GameState, code: string) =>
  activePlayers(state).find((n) => n.code === code)?.id;

/** Starts the chosen mode; for the gauntlet, that means its first game. */
function startRound(state: GameState): GameState {
  if (state.mode !== "gauntlet") return beginGame({ ...state, gauntlet: null });
  const gauntlet = initialGauntlet();
  return beginGame({ ...state, gauntlet, mode: gauntlet.games[0] });
}

/** Back to the menu; a gauntlet in progress is abandoned and its menu tab selected again. */
function toMenu(state: GameState): GameState {
  return {
    ...state,
    phase: "menu",
    mode: state.gauntlet ? "gauntlet" : state.mode,
    gauntlet: null,
    escapeArmedAt: null,
  };
}

/** The gauntlet moves on: straight into the next game's countdown, or to the final standings. */
function nextGauntletGame(state: GameState, at: number): GameState {
  const run = state.gauntlet;
  if (!run) return state;
  if (isLastGame(run)) {
    return {
      ...state,
      mode: "gauntlet",
      phase: "finale",
      resultsShownAt: at,
      gauntlet: { ...run, nextIn: null },
    };
  }
  const gauntlet = { ...run, index: run.index + 1, nextIn: null };
  return beginGame({ ...state, gauntlet, mode: gauntlet.games[gauntlet.index] });
}

function beginGame(state: GameState): GameState {
  // Kunai Bullseye runs its own rounds, countdown and results inside its component.
  if (state.mode === "kunai") return { ...state, ...roundState(), phase: "kunai" };
  return { ...state, ...roundState(), phase: "countdown", countdown: COUNTDOWN_START };
}

function endRound(state: GameState): GameState {
  if (state.mode === "stack") return { ...state, phase: "ended" };

  // Blind mode: wait for any active hit videos to finish playing
  if (state.mode === "blind") {
    const videosDone = Array.from({ length: MAX_PLAYERS }, (_, i) => {
      // Inactive seats or players who never struck have no video to wait for
      if (i >= state.numPlayers || state.blind.strikeTimes[i] === undefined) {
        return true;
      }
      return state.videosDone[i];
    });

    if (videosDone.every(Boolean)) {
      return { ...state, videosDone, phase: "ended" };
    }
    return { ...state, videosDone, phase: "video" };
  }

  // Modes without outcome videos skip the video phase and go straight to ended
  if (!usesOutcomeMedia(state.mode)) return { ...state, phase: "ended" };
  return {
    ...state,
    phase: "video",
    videosDone: Array.from({ length: MAX_PLAYERS }, (_, i) => i >= state.numPlayers),
  };
}

/** A press during play, for the modes where a press is the action (Smash, Shadow Strike, Stack). */
function strike(state: GameState, code: string, at: number): GameState {
  if (state.startedAt === null) return state;
  const player = activePlayers(state).find((n) => n.code === code);
  if (!player) return state;

  const elapsed = Math.max(0, at - state.startedAt);
  if (elapsed >= roundMsFor(state.mode)) return state;
  const seat = player.id;

  switch (state.mode) {
    case "stack": {
      const seq = state.seq + 1;
      const stack = dropBlock(state.stack, seat, at, elapsed, seq);
      if (stack === state.stack) return state;
      const updated: GameState = { ...bumpPulse(state, seat), seq, stack };
      return everyoneDone(stack, state.numPlayers) ? endRound(updated) : updated;
    }
    case "mash":
      return { ...addHit(state, seat), mash: mashStrike(state.mash, seat) };
    case "blind": {
      if (hasStruck(state.blind, seat)) return state;
      const blind = blindStrike(state.blind, seat, elapsed);
      const updated: GameState = { ...addHit(state, seat), blind };
      return everyoneStruck(blind, state.numPlayers) ? endRound(updated) : updated;
    }
    default:
      return state;
  }
}

/** Tsugitashi countdown: it only runs while every ninja holds their button. */
function armButton(state: GameState, code: string, down: boolean): GameState {
  const seat = seatOf(state, code);
  if (seat === undefined) return state;
  const tsugitashi = setHeld(state.tsugitashi, seat, down);
  if (tsugitashi === state.tsugitashi) return state;
  // Letting go early restarts the countdown.
  return { ...state, tsugitashi, countdown: down ? state.countdown : COUNTDOWN_START };
}

/** Tsugitashi: a player lets go and locks in whatever the counter shows. */
function release(state: GameState, code: string, at: number): GameState {
  const seat = seatOf(state, code);
  if (seat === undefined || state.startedAt === null) return state;
  const tsugitashi = lockIn(state.tsugitashi, seat, at - state.startedAt);
  if (tsugitashi === state.tsugitashi) return state;
  const updated: GameState = { ...bumpPulse(state, seat), tsugitashi };
  return everyoneLocked(tsugitashi, state.numPlayers) ? endRound(updated) : updated;
}

/** Tsugitashi: the window lost focus, so every held button counts as released. */
function releaseAll(state: GameState, at: number): GameState {
  if (state.mode !== "tsugitashi") return state;
  if (state.phase === "countdown") {
    if (!state.tsugitashi.held.some(Boolean)) return state;
    const tsugitashi = { ...state.tsugitashi, held: filled(false) };
    return { ...state, tsugitashi, countdown: COUNTDOWN_START };
  }
  if (state.phase === "playing") {
    return activePlayers(state).reduce((s, n) => release(s, n.code, at), state);
  }
  return state;
}

/**
 * Escape leaves the menu-bound screens at once, but mid-match it takes two presses so one
 * stray key on a shared keyboard can't end everybody's round.
 */
function escape(state: GameState, at: number): GameState {
  if (state.phase === "menu") return state;
  // Leaving at once is fine once nothing is left to lose; mid-gauntlet there always is.
  const leaveAtOnce = state.phase === "finale" || (state.phase === "results" && !state.gauntlet);
  const confirmed =
    leaveAtOnce || (state.escapeArmedAt !== null && at - state.escapeArmedAt <= ESCAPE_CONFIRM_MS);
  return confirmed ? toMenu(state) : { ...state, escapeArmedAt: at };
}

/** Files away how a game of the gauntlet finished and starts the countdown to the next. */
function recordGauntlet(state: GameState, ranks: readonly (number | null)[]): GameState {
  return state.gauntlet ? { ...state, gauntlet: recordGame(state.gauntlet, ranks) } : state;
}

function handleKey(state: GameState, code: string, at: number): GameState {
  if (code === "Escape") return escape(state, at);

  switch (state.phase) {
    case "menu": {
      if (CONFIRM_CODES.has(code)) return startRound(state);
      const count = PLAYER_COUNT_CODES[code];
      return count ? { ...state, numPlayers: count } : state;
    }
    case "countdown":
      return state.mode === "tsugitashi" ? armButton(state, code, true) : state;
    case "playing":
      // Tsugitashi buttons only count when they are released.
      return state.mode === "tsugitashi" ? state : strike(state, code, at);
    case "results":
    case "finale":
      // Mid-gauntlet the countdown moves things along, so a mashed key must not quit it.
      if (state.gauntlet && state.phase === "results") return state;
      return CONFIRM_CODES.has(code) && at - state.resultsShownAt >= RESULTS_INPUT_LOCK_MS
        ? toMenu(state)
        : state;
    default:
      return state;
  }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "select_mode":
      return state.phase === "menu" ? { ...state, mode: action.mode } : state;
    case "select_player_count":
      return state.phase === "menu" ? { ...state, numPlayers: action.count } : state;
    case "select_color":
      return state.phase === "menu"
        ? { ...state, ninjas: assignColor(state.ninjas, action.playerId, action.color) }
        : state;
    case "start":
      return state.phase === "menu" ? startRound(state) : state;
    case "countdown_tick":
      return state.phase === "countdown" &&
        state.countdown > 0 &&
        (state.mode !== "tsugitashi" || everyoneHolding(state.tsugitashi, state.numPlayers))
        ? { ...state, countdown: state.countdown - 1 }
        : state;
    case "begin_play": {
      if (state.phase !== "countdown" || state.countdown !== 0) return state;
      if (state.mode === "tsugitashi" && !everyoneHolding(state.tsugitashi, state.numPlayers)) {
        return state;
      }
      return {
        ...state,
        phase: "playing",
        startedAt: action.at,
        stack: state.mode === "stack" ? startTowers(state.stack, action.at) : state.stack,
        tsugitashi:
          state.mode === "tsugitashi"
            ? drawTarget(state.tsugitashi, action.random ?? 0.5)
            : state.tsugitashi,
      };
    }
    case "play_painted": {
      if (state.phase !== "playing" || state.startedAt === null || state.playSynced) return state;
      // Rendering can lag behind the state change; the time it took is not the players' to lose.
      const lag = Math.max(0, action.at - state.startedAt);
      return {
        ...state,
        playSynced: true,
        startedAt: state.startedAt + lag,
        stack: state.mode === "stack" ? delayTowers(state.stack, lag) : state.stack,
      };
    }
    case "time_up":
      if (state.phase !== "playing") return state;
      return state.mode === "tsugitashi"
        ? endRound({ ...state, tsugitashi: bustHolders(state.tsugitashi) })
        : endRound(state);
    case "video_ended": {
      const videosDone = replaceAt(state.videosDone, action.playerId, () => true);
      return state.phase === "video" && videosDone.every(Boolean)
        ? { ...state, videosDone, phase: "ended" }
        : { ...state, videosDone };
    }
    case "video_timeout":
      return state.phase === "video" ? { ...state, phase: "ended" } : state;
    case "show_results": {
      if (state.phase !== "ended") return state;
      const shown: GameState = { ...state, phase: "results", resultsShownAt: action.at };
      if (!shown.gauntlet) return shown;
      const { byPlayer } = resultsFor(shown);
      const ranks = shown.ninjas
        .slice(0, shown.numPlayers)
        .map((n) => byPlayer[n.id]?.rank ?? null);
      return recordGauntlet(shown, ranks);
    }
    case "hit_done":
      return removeHit(state, action.playerId, action.hitId);
    case "stack_tick": {
      if (state.phase !== "playing" || state.mode !== "stack") return state;
      const stack = advanceTowers(state.stack, state.numPlayers, action.at);
      return stack === state.stack ? state : { ...state, stack };
    }
    case "burst_done": {
      const stack = removeBurst(state.stack, action.playerId, action.burstId);
      return stack === state.stack ? state : { ...state, stack };
    }
    case "return_to_menu":
      return state.phase === "results" || state.phase === "kunai" || state.phase === "finale"
        ? toMenu(state)
        : state;
    case "kunai_finished":
      return state.phase === "kunai" ? recordGauntlet(state, action.ranks) : state;
    case "gauntlet_tick": {
      const run = state.gauntlet;
      if (!run || run.nextIn === null) return state;
      return run.nextIn > 1
        ? { ...state, gauntlet: { ...run, nextIn: run.nextIn - 1 } }
        : nextGauntletGame(state, action.at);
    }
    case "key_down":
      return handleKey(state, action.code, action.at);
    case "release_all":
      return releaseAll(state, action.at);
    case "key_up":
      if (state.mode !== "tsugitashi") return state;
      if (state.phase === "countdown") return armButton(state, action.code, false);
      return state.phase === "playing" ? release(state, action.code, action.at) : state;
  }
}
