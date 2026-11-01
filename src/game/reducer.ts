import {
  COUNTDOWN_START,
  MAX_PLAYERS,
  MAX_VISIBLE_HITS,
  RESULTS_INPUT_LOCK_MS,
  ROUND_MS,
  TSUGITASHI_MAX_TARGET,
  TSUGITASHI_MIN_TARGET,
} from "./config";
import type { GameMode, Hit, Ninja, NinjaColor, Phase, PlayerCount, StackPlayer } from "./types";
import { assignColor, DEFAULT_NINJAS } from "./ninjas";
import { unit } from "./random";
import {
  MAX_ACTIVE_BURSTS,
  MAX_CATCH_UP_MOVES,
  STACK_ROWS,
  advanceBlock,
  createStackPlayer,
  newMovingBlock,
  overlapWith,
  speedForRows,
} from "./stack";
import { bustMs, counterAt } from "./tsugitashi";

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
  /** Shinobi Stack towers, one per seat. */
  stacks: StackPlayer[];
  hitSeq: number;
  videosDone: boolean[];
  resultsShownAt: number;
  /** Tsugitashi: the number to get closest to without going over. */
  target: number;
  /** Tsugitashi: whose button is currently held down. */
  held: boolean[];
  /** Tsugitashi: the counter value each player let go at (over `target` is a bust). */
  locked: (number | undefined)[];
}

export type GameAction =
  | { type: "select_mode"; mode: GameMode }
  | { type: "select_player_count"; count: PlayerCount }
  | { type: "select_color"; playerId: number; color: NinjaColor }
  | { type: "start" }
  | { type: "countdown_tick" }
  /** `random` in [0, 1) picks the Tsugitashi target; it arrives with the action to keep the reducer pure. */
  | { type: "begin_play"; at: number; random?: number }
  | { type: "time_up" }
  | { type: "video_ended"; playerId: number }
  | { type: "video_timeout" }
  | { type: "show_results"; at: number }
  | { type: "hit_done"; playerId: number; hitId: number }
  | { type: "stack_tick"; at: number }
  | { type: "burst_done"; playerId: number; burstId: number }
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
    stacks: Array.from({ length: MAX_PLAYERS }, createStackPlayer),
    videosDone: filled(false),
    resultsShownAt: 0,
    target: 0,
    held: filled(false),
    locked: filled<number | undefined>(undefined),
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
    ...roundState(),
  };
}

function replaceAt<T>(list: readonly T[], index: number, update: (value: T) => T): T[] {
  return list.map((value, i) => (i === index ? update(value) : value));
}

/** How long the round runs: Tsugitashi ends the moment the counter passes the target. */
export function roundDuration(state: Pick<GameState, "mode" | "target">): number {
  return state.mode === "tsugitashi" ? bustMs(state.target) : ROUND_MS[state.mode];
}

function seatOf(state: GameState, code: string) {
  return state.ninjas.slice(0, state.numPlayers).find((n) => n.code === code)?.id;
}

const everyoneHolding = (state: GameState) => state.held.slice(0, state.numPlayers).every(Boolean);

/** Tsugitashi countdown: it only runs while every ninja holds their button. */
function armButton(state: GameState, code: string, down: boolean): GameState {
  const id = seatOf(state, code);
  if (id === undefined || state.held[id] === down) return state;
  return {
    ...state,
    held: replaceAt(state.held, id, () => down),
    // Letting go early restarts the countdown.
    countdown: down ? state.countdown : COUNTDOWN_START,
  };
}

/** Tsugitashi: a player lets go and locks in whatever the counter shows. */
function lockIn(state: GameState, code: string, at: number): GameState {
  const id = seatOf(state, code);
  if (id === undefined || !state.held[id] || state.startedAt === null) return state;
  const locked = replaceAt(state.locked, id, () => counterAt(at - state.startedAt!));
  const updated: GameState = {
    ...state,
    held: replaceAt(state.held, id, () => false),
    locked,
    pulses: replaceAt(state.pulses, id, (n) => n + 1),
  };
  return locked.slice(0, state.numPlayers).every((v) => v !== undefined) ? endRound(updated) : updated;
}

/** Tsugitashi: the counter passed the target, so anyone still holding busts. */
function bustHolders(state: GameState): GameState {
  const over = Math.max(state.target + 1, counterAt(bustMs(state.target)));
  return endRound({
    ...state,
    locked: state.locked.map((v, i) => (state.held[i] && v === undefined ? over : v)),
    held: filled(false),
  });
}

function startRound(state: GameState): GameState {
  // Kunai Bullseye runs its own rounds, countdown and results inside its component.
  if (state.mode === "kunai") return { ...state, ...roundState(), phase: "kunai" };
  return { ...state, ...roundState(), phase: "countdown", countdown: COUNTDOWN_START };
}

function endRound(state: GameState): GameState {
  // Stack rounds skip the win/lose videos so players can study their towers.
  if (state.mode === "stack") return { ...state, phase: "ended" };
  return {
    ...state,
    phase: "video",
    videosDone: Array.from({ length: MAX_PLAYERS }, (_, i) => i >= state.numPlayers),
  };
}

/** Locks the climbing block of `id` onto its tower (or topples the tower). */
function dropBlock(state: GameState, id: number, at: number, elapsed: number): GameState {
  const player = state.stacks[id];
  if (!player || player.status !== "climbing") return state;

  // The first block always lands; later blocks are trimmed to the overlap.
  const top = player.rows[player.rows.length - 1];
  const placed = top ? overlapWith(player.current, top) : { x: player.current.x, width: player.current.width };

  const hitSeq = state.hitSeq + 1;
  let next: StackPlayer;
  if (!placed) {
    next = { ...player, status: "fallen", finishedAtMs: elapsed };
  } else {
    const rows = [...player.rows, placed];
    const bursts = [
      ...player.bursts.slice(-(MAX_ACTIVE_BURSTS - 1)),
      { id: hitSeq, cx: placed.x + placed.width / 2, level: rows.length - 1 },
    ];
    next =
      rows.length >= STACK_ROWS
        ? { ...player, rows, bursts, status: "summit", finishedAtMs: elapsed }
        : {
            ...player,
            rows,
            bursts,
            current: newMovingBlock(placed.width),
            nextMoveAt: at + speedForRows(rows.length),
          };
  }

  const stacks = replaceAt(state.stacks, id, () => next);
  const updated: GameState = {
    ...state,
    hitSeq,
    stacks,
    pulses: replaceAt(state.pulses, id, (n) => n + 1),
  };
  const everyoneDone = state.ninjas
    .slice(0, state.numPlayers)
    .every((p) => stacks[p.id].status !== "climbing");
  return everyoneDone ? endRound(updated) : updated;
}

/** Advances every climbing player's moving block that is due. */
function advanceStacks(state: GameState, at: number): GameState {
  if (state.phase !== "playing" || state.mode !== "stack") return state;

  let changed = false;
  const stacks = state.stacks.map((p, i) => {
    if (i >= state.numPlayers || p.status !== "climbing" || at < p.nextMoveAt) return p;
    let { current, nextMoveAt } = p;
    const interval = speedForRows(p.rows.length);
    for (let n = 0; n < MAX_CATCH_UP_MOVES && at >= nextMoveAt; n++) {
      current = advanceBlock(current);
      nextMoveAt += interval;
    }
    if (at >= nextMoveAt) nextMoveAt = at + interval; // resync after a long stall
    changed = true;
    return { ...p, current, nextMoveAt };
  });
  return changed ? { ...state, stacks } : state;
}

/** When the next stack block is due to move (`null` if nothing is moving). */
export function nextStackDue(state: GameState): number | null {
  if (state.phase !== "playing" || state.mode !== "stack") return null;
  let due: number | null = null;
  for (const p of state.stacks.slice(0, state.numPlayers)) {
    if (p.status === "climbing" && (due === null || p.nextMoveAt < due)) due = p.nextMoveAt;
  }
  return due;
}

function strike(state: GameState, code: string, at: number): GameState {
  if (state.startedAt === null) return state;

  const players = state.ninjas.slice(0, state.numPlayers);
  const player = players.find((n) => n.code === code);
  if (!player) return state;

  const elapsed = Math.max(0, at - state.startedAt);
  if (elapsed >= ROUND_MS[state.mode]) return state;
  if (state.mode === "stack") return dropBlock(state, player.id, at, elapsed);

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

  const strikeTimes = replaceAt(state.strikeTimes, id, () => (ROUND_MS.blind - elapsed) / 1000);
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
    case "countdown":
      return state.mode === "tsugitashi" ? armButton(state, code, true) : state;
    case "playing":
      // Tsugitashi buttons only count when they are released.
      return state.mode === "tsugitashi" ? state : strike(state, code, at);
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
      return state.phase === "countdown" &&
        state.countdown > 0 &&
        (state.mode !== "tsugitashi" || everyoneHolding(state))
        ? { ...state, countdown: state.countdown - 1 }
        : state;
    case "begin_play": {
      if (state.phase !== "countdown" || state.countdown !== 0) return state;
      if (state.mode === "tsugitashi" && !everyoneHolding(state)) return state;
      const span = TSUGITASHI_MAX_TARGET - TSUGITASHI_MIN_TARGET + 1;
      return {
        ...state,
        phase: "playing",
        startedAt: action.at,
        stacks: state.stacks.map((p) => ({ ...p, nextMoveAt: action.at + speedForRows(0) })),
        target:
          state.mode === "tsugitashi"
            ? TSUGITASHI_MIN_TARGET + Math.floor((action.random ?? 0.5) * span)
            : state.target,
      };
    }
    case "time_up":
      if (state.phase !== "playing") return state;
      return state.mode === "tsugitashi" ? bustHolders(state) : endRound(state);
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
    case "stack_tick":
      return advanceStacks(state, action.at);
    case "burst_done": {
      const stack = state.stacks[action.playerId];
      if (!stack?.bursts.some((b) => b.id === action.burstId)) return state;
      return {
        ...state,
        stacks: replaceAt(state.stacks, action.playerId, (p) => ({
          ...p,
          bursts: p.bursts.filter((b) => b.id !== action.burstId),
        })),
      };
    }
    case "return_to_menu":
      return state.phase === "results" || state.phase === "kunai" ? { ...state, phase: "menu" } : state;
    case "key_down":
      return handleKey(state, action.code, action.at);
    case "key_up":
      if (state.mode !== "tsugitashi") return state;
      if (state.phase === "countdown") return armButton(state, action.code, false);
      return state.phase === "playing" ? lockIn(state, action.code, action.at) : state;
  }
}
