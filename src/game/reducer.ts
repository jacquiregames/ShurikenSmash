import {
  BAKUDAN_MAX_MS,
  BAKUDAN_MIN_MS,
  COUNTDOWN_START,
  GAME_MS,
  MAX_PLAYERS,
  MAX_VISIBLE_HITS,
  RESULTS_INPUT_LOCK_MS,
  WABUN_DASH_MS,
  WABUN_MS,
} from "./config";
import type {
  GameMode,
  Hit,
  Knockout,
  KnockoutCause,
  Ninja,
  NinjaColor,
  Phase,
  PlayerCount,
} from "./types";
import { assignColor, DEFAULT_NINJAS } from "./ninjas";
import { WORDS } from "./wabun";

function unit(seed: number): number {
  let t = (seed + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function createHit(seq: number): Hit {
  return {
    id: seq,
    x: 15 + unit(seq * 3 + 1) * 70,
    y: 20 + unit(seq * 3 + 2) * 50,
    rot: unit(seq * 3 + 3) * 360,
  };
}

export interface GameState {
  phase: Phase;
  mode: GameMode;
  numPlayers: PlayerCount;
  ninjas: Ninja[];
  countdown: number;
  startedAt: number | null;
  counts: number[];
  strikeTimes: (number | undefined)[];
  pulses: number[];
  hits: Hit[][];
  hitSeq: number;
  videosDone: boolean[];
  resultsShownAt: number;
  /** Length of the current round; random and hidden in Bakudan. */
  roundMs: number;
  /** Bakudan: 1-based round number within the match. */
  round: number;
  /** Bakudan: players still in the match. */
  alive: boolean[];
  /** Bakudan: id of the player holding the bomb, while a round is live. */
  holder: number | null;
  /** Bakudan: eliminations in the order they happened. */
  knockouts: Knockout[];
  /** Wabun: index into WORDS of the word being spelled. */
  wordIndex: number;
  /** Wabun: Morse characters each player has sent correctly so far. */
  progress: number[];
  /** Wabun: dots and dashes of the character each player is partway through. */
  partials: string[];
  /** Wabun: when each player's button went down, while it is held. */
  pressedAt: (number | undefined)[];
  /** Wabun: mistakes per player (each one reset them to the start). */
  mistakes: number[];
}

export type GameAction =
  | { type: "select_mode"; mode: GameMode }
  | { type: "select_player_count"; count: PlayerCount }
  | { type: "select_color"; playerId: number; color: NinjaColor }
  | { type: "start" }
  | { type: "countdown_tick" }
  /** `random` is a number in [0, 1) that seeds the round's random choices. */
  | { type: "begin_play"; at: number; random: number }
  | { type: "time_up" }
  | { type: "next_round" }
  | { type: "video_ended"; playerId: number }
  | { type: "video_timeout" }
  | { type: "show_results"; at: number }
  | { type: "hit_done"; playerId: number; hitId: number }
  | { type: "return_to_menu" }
  | { type: "key_down"; code: string; at: number }
  | { type: "key_up"; code: string; at: number };

const CONFIRM_CODES = new Set(["Enter", "NumpadEnter", "Space"]);
const PLAYER_COUNT_CODES: Record<string, PlayerCount> = {
  Digit3: 3,
  Numpad3: 3,
  Digit4: 4,
  Numpad4: 4,
};

const filled = <T,>(value: T) => Array.from({ length: MAX_PLAYERS }, () => value);

function roundState() {
  return {
    startedAt: null,
    counts: filled(0),
    strikeTimes: filled<number | undefined>(undefined),
    pulses: filled(0),
    hits: Array.from({ length: MAX_PLAYERS }, (): Hit[] => []),
    videosDone: filled(false),
    resultsShownAt: 0,
    roundMs: GAME_MS,
    round: 1,
    alive: filled(true),
    holder: null,
    knockouts: [],
    progress: filled(0),
    partials: filled(""),
    pressedAt: filled<number | undefined>(undefined),
    mistakes: filled(0),
  };
}

export function createInitialState(): GameState {
  return {
    phase: "menu",
    mode: "mash",
    numPlayers: 4,
    ninjas: DEFAULT_NINJAS,
    countdown: COUNTDOWN_START,
    hitSeq: 0,
    wordIndex: 0,
    ...roundState(),
  };
}

function replaceAt<T>(list: readonly T[], index: number, update: (value: T) => T): T[] {
  return list.map((value, i) => (i === index ? update(value) : value));
}

function startRound(state: GameState): GameState {
  return {
    ...state,
    ...roundState(),
    phase: "countdown",
    countdown: COUNTDOWN_START,
    roundMs: state.mode === "wabun" ? WABUN_MS : GAME_MS,
  };
}

function endRound(state: GameState): GameState {
  return {
    ...state,
    phase: "video",
    videosDone: Array.from({ length: MAX_PLAYERS }, (_, i) => i >= state.numPlayers),
  };
}

function beginPlay(state: GameState, at: number, random: number): GameState {
  const next: GameState = { ...state, phase: "playing", startedAt: at };
  // Randomness arrives with the action so the reducer stays pure and testable.
  const seed = Math.floor(random * 2 ** 32) | 0;

  if (state.mode === "wabun") {
    // Never repeat the previous word back to back.
    const offset = 1 + Math.floor(unit(seed) * (WORDS.length - 1));
    return { ...next, wordIndex: (state.wordIndex + offset) % WORDS.length };
  }
  if (state.mode !== "bakudan") return next;

  const ids = aliveIds(state);
  return {
    ...next,
    roundMs: BAKUDAN_MIN_MS + Math.floor(unit(seed) * (BAKUDAN_MAX_MS - BAKUDAN_MIN_MS)),
    holder: ids[Math.floor(unit(seed + 1) * ids.length)],
  };
}

function aliveIds(state: GameState): number[] {
  return state.ninjas
    .slice(0, state.numPlayers)
    .filter((n) => state.alive[n.id])
    .map((n) => n.id);
}

function nextAlive(state: GameState, fromId: number): number {
  for (let step = 1; step <= state.numPlayers; step++) {
    const id = (fromId + step) % state.numPlayers;
    if (state.alive[id]) return id;
  }
  return fromId;
}

function knockOut(state: GameState, playerId: number, cause: KnockoutCause): GameState {
  return {
    ...state,
    alive: replaceAt(state.alive, playerId, () => false),
    knockouts: [...state.knockouts, { playerId, round: state.round, cause }],
  };
}

function nextRound(state: GameState): GameState {
  if (aliveIds(state).length <= 1) return endRound(state);
  return {
    ...state,
    phase: "countdown",
    countdown: COUNTDOWN_START,
    startedAt: null,
    holder: null,
    round: state.round + 1,
  };
}

function passBomb(state: GameState, id: number): GameState {
  if (!state.alive[id]) return state;

  if (id !== state.holder) {
    const updated = knockOut(state, id, "fumble");
    return aliveIds(updated).length <= 1 ? { ...updated, phase: "boom" } : updated;
  }

  const hitSeq = state.hitSeq + 1;
  return {
    ...state,
    hitSeq,
    holder: nextAlive(state, id),
    pulses: replaceAt(state.pulses, id, (n) => n + 1),
    hits: replaceAt(state.hits, id, (list) => [
      ...list.slice(-(MAX_VISIBLE_HITS - 1)),
      createHit(hitSeq),
    ]),
  };
}

/** Wabun: turn a finished press into a dot or dash and check it against the word. */
function sendSymbol(state: GameState, id: number, symbol: "." | "-"): GameState {
  const { codes } = WORDS[state.wordIndex];
  const target = codes[state.progress[id]];
  const partial = state.partials[id] + symbol;
  const hitSeq = state.hitSeq + 1;
  const base: GameState = {
    ...state,
    hitSeq,
    pulses: replaceAt(state.pulses, id, (n) => n + 1),
  };

  if (!target?.startsWith(partial)) {
    return {
      ...base,
      progress: replaceAt(state.progress, id, () => 0),
      partials: replaceAt(state.partials, id, () => ""),
      mistakes: replaceAt(state.mistakes, id, (n) => n + 1),
    };
  }

  if (partial !== target) {
    return { ...base, partials: replaceAt(state.partials, id, () => partial) };
  }

  const progress = replaceAt(state.progress, id, (n) => n + 1);
  const updated = { ...base, progress, partials: replaceAt(state.partials, id, () => "") };
  return progress[id] === codes.length ? endRound(updated) : updated;
}

function release(state: GameState, code: string, at: number): GameState {
  if (state.phase !== "playing" || state.mode !== "wabun") return state;
  const player = state.ninjas.slice(0, state.numPlayers).find((n) => n.code === code);
  const pressedAt = player && state.pressedAt[player.id];
  if (!player || pressedAt === undefined) return state;

  const released = { ...state, pressedAt: replaceAt(state.pressedAt, player.id, () => undefined) };
  return sendSymbol(released, player.id, at - pressedAt >= WABUN_DASH_MS ? "-" : ".");
}

function strike(state: GameState, code: string, at: number): GameState {
  if (state.startedAt === null) return state;

  const players = state.ninjas.slice(0, state.numPlayers);
  const player = players.find((n) => n.code === code);
  if (!player) return state;

  const elapsed = Math.max(0, at - state.startedAt);
  if (elapsed >= state.roundMs) return state;

  if (state.mode === "bakudan") return passBomb(state, player.id);
  if (state.mode === "wabun") {
    return state.pressedAt[player.id] === undefined
      ? { ...state, pressedAt: replaceAt(state.pressedAt, player.id, () => at) }
      : state;
  }

  const id = player.id;
  if (state.mode === "blind" && state.strikeTimes[id] !== undefined) return state;

  const hitSeq = state.hitSeq + 1;
  const next: GameState = {
    ...state,
    hitSeq,
    pulses: replaceAt(state.pulses, id, (n) => n + 1),
    hits: replaceAt(state.hits, id, (list) => [
      ...list.slice(-(MAX_VISIBLE_HITS - 1)),
      createHit(hitSeq),
    ]),
  };

  if (state.mode === "mash") {
    return { ...next, counts: replaceAt(state.counts, id, (n) => n + 1) };
  }

  const strikeTimes = replaceAt(state.strikeTimes, id, () => (GAME_MS - elapsed) / 1000);
  const updated = { ...next, strikeTimes };
  return players.every((p) => strikeTimes[p.id] !== undefined) ? endRound(updated) : updated;
}

function handleKey(state: GameState, code: string, at: number): GameState {
  if (code === "Escape") {
    return state.phase === "menu" ? state : { ...state, phase: "menu" };
  }

  switch (state.phase) {
    case "menu": {
      if (CONFIRM_CODES.has(code)) return startRound(state);
      const count = PLAYER_COUNT_CODES[code];
      return count ? { ...state, numPlayers: count } : state;
    }
    case "playing":
      return strike(state, code, at);
    case "results":
      return CONFIRM_CODES.has(code) && at - state.resultsShownAt >= RESULTS_INPUT_LOCK_MS
        ? { ...state, phase: "menu" }
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
      return state.phase === "countdown" && state.countdown > 0
        ? { ...state, countdown: state.countdown - 1 }
        : state;
    case "begin_play":
      return state.phase === "countdown" && state.countdown === 0
        ? beginPlay(state, action.at, action.random)
        : state;
    case "time_up":
      if (state.phase !== "playing") return state;
      if (state.mode !== "bakudan") return endRound(state);
      return state.holder === null
        ? nextRound(state)
        : { ...knockOut(state, state.holder, "boom"), phase: "boom", holder: null };
    case "next_round":
      return state.phase === "boom" ? nextRound(state) : state;
    case "video_ended": {
      if (state.phase !== "video") return state;
      const videosDone = replaceAt(state.videosDone, action.playerId, () => true);
      return videosDone.every(Boolean)
        ? { ...state, videosDone, phase: "ended" }
        : { ...state, videosDone };
    }
    case "video_timeout":
      return state.phase === "video" ? { ...state, phase: "ended" } : state;
    case "show_results":
      return state.phase === "ended"
        ? { ...state, phase: "results", resultsShownAt: action.at }
        : state;
    case "hit_done": {
      const list = state.hits[action.playerId];
      if (!list?.some((h) => h.id === action.hitId)) return state;
      return {
        ...state,
        hits: replaceAt(state.hits, action.playerId, (l) => l.filter((h) => h.id !== action.hitId)),
      };
    }
    case "return_to_menu":
      return state.phase === "results" ? { ...state, phase: "menu" } : state;
    case "key_down":
      return handleKey(state, action.code, action.at);
    case "key_up":
      return release(state, action.code, action.at);
  }
}
