import { describe, expect, it } from "vitest";
import { COUNTDOWN_START, ESCAPE_CONFIRM_MS, RESULTS_INPUT_LOCK_MS } from "../shared/config/timing";
import { assignColor, DEFAULT_NINJAS } from "../shared/game/ninjas";
import type { GameMode } from "../shared/game/types";
import { roundMsFor, usesOutcomeMedia } from "../modes/registry";
import { TSUGITASHI_MAX_TARGET, TSUGITASHI_MIN_TARGET } from "../modes/tsugitashi/config";
import { bustMs, counterAt } from "../modes/tsugitashi/tsugitashi";
import {
  createInitialState,
  gameReducer,
  nextStackDue,
  roundDuration,
  type GameAction,
  type GameState,
} from "./reducer";

const run = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state);

function playing(mode: GameMode = "mash", startedAt = 1000): GameState {
  let s = createInitialState();
  s = run(s, { type: "select_mode", mode }, { type: "start" });
  s = run(s, { type: "countdown_tick" }, { type: "countdown_tick" }, { type: "countdown_tick" });
  return run(s, { type: "begin_play", at: startedAt });
}

describe("countdown", () => {
  it("only begins play once the countdown has reached zero", () => {
    let s = run(createInitialState(), { type: "start" });
    expect(run(s, { type: "begin_play", at: 0 }).phase).toBe("countdown");
    s = run(s, { type: "countdown_tick" }, { type: "countdown_tick" }, { type: "countdown_tick" });
    expect(s.countdown).toBe(0);
    expect(run(s, { type: "begin_play", at: 0 }).phase).toBe("playing");
  });
});

describe("menu keys", () => {
  it("starts on Enter and picks player count with 3/4", () => {
    const s = run(createInitialState(), { type: "key_down", code: "Digit3", at: 0 });
    expect(s.numPlayers).toBe(3);
    expect(run(s, { type: "key_down", code: "Enter", at: 0 }).phase).toBe("countdown");
  });
});

describe("play start", () => {
  it("starts the clock when the first frame is painted, not when play was requested", () => {
    const s = run(playing("stack", 1000), { type: "play_painted", at: 2500 });
    expect(s.startedAt).toBe(2500);
    expect(s.playSynced).toBe(true);
    const before = playing("stack", 1000).stack.towers[0].nextMoveAt;
    expect(s.stack.towers[0].nextMoveAt).toBe(before + 1500);
  });

  it("only syncs once, and only while playing", () => {
    const s = run(playing("mash", 1000), { type: "play_painted", at: 1200 });
    expect(run(s, { type: "play_painted", at: 9000 })).toBe(s);
    const countdown = run(createInitialState(), { type: "start" });
    expect(run(countdown, { type: "play_painted", at: 5 })).toBe(countdown);
  });

  it("never moves the start earlier", () => {
    expect(run(playing("mash", 1000), { type: "play_painted", at: 400 }).startedAt).toBe(1000);
  });
});

describe("mash", () => {
  it("counts presses by event code and ignores unknown keys", () => {
    const s = run(
      playing(),
      { type: "key_down", code: "KeyA", at: 1100 },
      { type: "key_down", code: "KeyA", at: 1200 },
      { type: "key_down", code: "KeyQ", at: 1300 },
    );
    expect(s.mash.counts).toEqual([2, 0, 0, 0]);
  });

  it("ignores presses after time has elapsed", () => {
    const s = run(playing(), { type: "key_down", code: "KeyA", at: 1000 + roundMsFor("mash") });
    expect(s.mash.counts[0]).toBe(0);
  });

  it("ignores the 4th player's key in a 3-player game", () => {
    let s = createInitialState();
    s = run(s, { type: "select_player_count", count: 3 }, { type: "start" });
    s = run(s, { type: "countdown_tick" }, { type: "countdown_tick" }, { type: "countdown_tick" });
    s = run(s, { type: "begin_play", at: 0 }, { type: "key_down", code: "KeyL", at: 10 });
    expect(s.mash.counts[3]).toBe(0);
  });
});

describe("blind", () => {
  it("records remaining time from the event timestamp and locks the player", () => {
    const s = run(
      playing("blind"),
      { type: "key_down", code: "KeyA", at: 1000 + 9_000 },
      { type: "key_down", code: "KeyA", at: 1000 + 9_500 },
    );
    expect(s.blind.strikeTimes[0]).toBeCloseTo(1, 5);
  });

  it("enters video phase once every player strikes and ends once videos finish", () => {
    let s = playing("blind");
    for (const code of ["KeyA", "KeyF", "KeyH", "KeyL"]) {
      s = run(s, { type: "key_down", code, at: 5000 });
    }
    expect(s.phase).toBe("video");
    s = run(s, ...[0, 1, 2, 3].map((playerId): GameAction => ({ type: "video_ended", playerId })));
    expect(s.phase).toBe("ended");
  });
});

describe("round flow", () => {
  it("waits for every video, then results, then guards against mashed confirm keys", () => {
    let s = run(playing(), { type: "time_up" });
    expect(s.phase).toBe("video");
    s = run(s, ...[0, 1, 2].map((playerId): GameAction => ({ type: "video_ended", playerId })));
    expect(s.phase).toBe("video");
    s = run(s, { type: "video_ended", playerId: 3 });
    expect(s.phase).toBe("ended");

    s = run(s, { type: "show_results", at: 5000 });
    expect(run(s, { type: "key_down", code: "Enter", at: 5100 }).phase).toBe("results");
    expect(
      run(s, { type: "key_down", code: "Enter", at: 5000 + RESULTS_INPUT_LOCK_MS }).phase,
    ).toBe("menu");
  });

  it("stack rounds skip the videos and go straight to the ended phase", () => {
    expect(run(playing("stack"), { type: "time_up" }).phase).toBe("ended");
  });

  it("mash rounds still play the videos", () => {
    expect(run(playing("mash"), { type: "time_up" }).phase).toBe("video");
  });

  it("Escape needs a second press soon after to abort a match", () => {
    const esc = (at: number): GameAction => ({ type: "key_down", code: "Escape", at });
    const armed = run(playing(), esc(0));
    expect(armed.phase).toBe("playing");
    expect(armed.escapeArmedAt).toBe(0);
    expect(run(armed, esc(ESCAPE_CONFIRM_MS)).phase).toBe("menu");
    // too late: the second press only re-arms
    const late = run(armed, esc(ESCAPE_CONFIRM_MS + 1));
    expect(late.phase).toBe("playing");
    expect(late.escapeArmedAt).toBe(ESCAPE_CONFIRM_MS + 1);
  });

  it("Escape leaves the results screen straight away", () => {
    const s: GameState = { ...playing(), phase: "results" };
    expect(run(s, { type: "key_down", code: "Escape", at: 0 }).phase).toBe("menu");
  });
});

describe("kunai bullseye", () => {
  const kunaiMenu = () => run(createInitialState(), { type: "select_mode", mode: "kunai" });

  it("starts straight into the self-contained kunai phase (no countdown/videos)", () => {
    const s = run(kunaiMenu(), { type: "start" });
    expect(s.phase).toBe("kunai");
    expect(s.mode).toBe("kunai");
  });

  it("also starts from the Enter key on the menu", () => {
    expect(run(kunaiMenu(), { type: "key_down", code: "Enter", at: 0 }).phase).toBe("kunai");
  });

  it("ignores throw keys, ticks and timeouts while kunai is running", () => {
    const s = run(kunaiMenu(), { type: "start" });
    for (const a of [
      { type: "key_down", code: "KeyA", at: 10 },
      { type: "stack_tick", at: 10 },
      { type: "time_up" },
      { type: "video_timeout" },
      { type: "show_results", at: 10 },
    ] as GameAction[]) {
      expect(run(s, a)).toBe(s);
    }
  });

  it("returns to the menu from Escape or the exit action, keeping the chosen mode", () => {
    const s = run(kunaiMenu(), { type: "start" });
    const armed = run(s, { type: "key_down", code: "Escape", at: 0 });
    expect(armed.phase).toBe("kunai");
    expect(run(armed, { type: "key_down", code: "Escape", at: 100 }).phase).toBe("menu");
    const back = run(s, { type: "return_to_menu" });
    expect(back.phase).toBe("menu");
    expect(back.mode).toBe("kunai");
  });

  it("keeps the 3/4 player choice for the match", () => {
    const s = run(kunaiMenu(), { type: "select_player_count", count: 3 }, { type: "start" });
    expect(s.numPlayers).toBe(3);
  });

  it("never uses the win/lose media", () => {
    expect(usesOutcomeMedia("kunai")).toBe(false);
    expect(usesOutcomeMedia("stack")).toBe(false);
    expect(usesOutcomeMedia("blind")).toBe(false);
    expect(usesOutcomeMedia("mash")).toBe(true);
  });
});

describe("assignColor", () => {
  it("swaps colors so they stay unique", () => {
    const next = assignColor(DEFAULT_NINJAS, 0, "green");
    expect(next[0].colorName).toBe("green");
    expect(next[1].colorName).toBe("red");
    expect(new Set(next.map((n) => n.colorName)).size).toBe(4);
  });
});

describe("shinobi stack", () => {
  const drop = (code: string, at: number): GameAction => ({ type: "key_down", code, at });

  it("starts every tower's clock when play begins", () => {
    const s = playing("stack");
    expect(s.stack.towers[0].nextMoveAt).toBeGreaterThan(1000);
    expect(nextStackDue(s)).toBe(s.stack.towers[0].nextMoveAt);
  });

  it("advances the moving block only when its tick is due", () => {
    const s = playing("stack");
    expect(run(s, { type: "stack_tick", at: 1000 }).stack.towers[0].current.x).toBe(0);
    const moved = run(s, { type: "stack_tick", at: s.stack.towers[0].nextMoveAt });
    expect(moved.stack.towers[0].current.x).toBe(1);
  });

  it("locks a block on drop and trims the next one to the overlap", () => {
    let s = playing("stack");
    s = run(s, drop("KeyA", 1100)); // first block always lands (x 0, width 3)
    expect(s.stack.towers[0].rows).toEqual([{ x: 0, width: 3 }]);
    s = run(s, { type: "stack_tick", at: s.stack.towers[0].nextMoveAt }); // current moves to x 1
    s = run(s, drop("KeyA", 1300));
    expect(s.stack.towers[0].rows[1]).toEqual({ x: 1, width: 2 });
    expect(s.stack.towers[1].rows).toHaveLength(0); // other towers untouched
  });

  it("topples a tower that misses, and ends the round when everyone is done", () => {
    let s = playing("stack");
    s = run(s, drop("KeyA", 1100));
    s = {
      ...s,
      stack: {
        towers: s.stack.towers.map((p, i) =>
          i === 0 ? { ...p, current: { x: 7, width: 1, dir: -1 } } : p,
        ),
      },
    };
    s = run(s, drop("KeyA", 1200));
    expect(s.stack.towers[0].status).toBe("fallen");
    expect(s.phase).toBe("playing");
    for (const code of ["KeyF", "KeyH", "KeyL"]) {
      s = {
        ...s,
        stack: {
          towers: s.stack.towers.map((p) =>
            p.status === "climbing"
              ? { ...p, rows: [{ x: 0, width: 1 }], current: { x: 5, width: 1, dir: 1 } }
              : p,
          ),
        },
      };
      s = run(s, drop(code, 1300));
    }
    expect(s.phase).toBe("ended");
  });

  it("stack rounds last longer than mash rounds", () => {
    const s = playing("stack");
    expect(run(s, drop("KeyA", 1000 + roundMsFor("mash") + 1)).stack.towers[0].rows).toHaveLength(
      1,
    );
    expect(run(s, drop("KeyA", 1000 + roundMsFor("stack"))).stack.towers[0].rows).toHaveLength(0);
  });

  it("removes a burst once its animation ends", () => {
    let s = run(playing("stack"), drop("KeyA", 1100));
    const id = s.stack.towers[0].bursts[0].id;
    s = run(s, { type: "burst_done", playerId: 0, burstId: id });
    expect(s.stack.towers[0].bursts).toHaveLength(0);
  });

  // Regression: the hook's timer must always make progress, otherwise the
  // effect keyed on nextStackDue never re-arms and the blocks freeze.
  it("ignores a tick that fires before the due time (same state, so no re-render)", () => {
    const s = playing("stack");
    const due = nextStackDue(s)!;
    expect(run(s, { type: "stack_tick", at: due - 0.5 })).toBe(s);
  });

  it("always changes the next due time when ticked at exactly the due time", () => {
    const s = playing("stack");
    const due = nextStackDue(s)!;
    const next = run(s, { type: "stack_tick", at: due });
    expect(next).not.toBe(s);
    expect(nextStackDue(next)).toBeGreaterThan(due);
  });

  it("keeps making progress across many consecutive due-time ticks", () => {
    let s = playing("stack");
    for (let i = 0; i < 50; i++) {
      const due = nextStackDue(s);
      expect(due).not.toBeNull();
      const next = run(s, { type: "stack_tick", at: due! });
      expect(nextStackDue(next)).toBeGreaterThan(due!);
      s = next;
    }
  });
});

describe("tsugitashi", () => {
  const CODES = ["KeyA", "KeyF", "KeyH", "KeyL"];
  const down = (id: number, at = 0): GameAction => ({ type: "key_down", code: CODES[id], at });
  const up = (id: number, at: number): GameAction => ({ type: "key_up", code: CODES[id], at });
  const tick: GameAction = { type: "countdown_tick" };

  function armed(): GameState {
    const s = run(
      createInitialState(),
      { type: "select_mode", mode: "tsugitashi" },
      { type: "start" },
    );
    return run(s, down(0), down(1), down(2), down(3));
  }

  function playing(startedAt = 1000, random = 0.5): GameState {
    return run(armed(), tick, tick, tick, { type: "begin_play", at: startedAt, random });
  }

  it("holds the countdown until every ninja is holding their button", () => {
    let s = run(
      createInitialState(),
      { type: "select_mode", mode: "tsugitashi" },
      { type: "start" },
    );
    s = run(s, down(0), down(1), down(2), tick);
    expect(s.countdown).toBe(COUNTDOWN_START);
    s = run(s, down(3), tick);
    expect(s.countdown).toBe(COUNTDOWN_START - 1);
  });

  it("restarts the countdown if someone lets go early", () => {
    let s = run(armed(), tick, tick);
    s = run(s, up(2, 0));
    expect(s.countdown).toBe(COUNTDOWN_START);
    s = run(s, tick, tick, tick, { type: "begin_play", at: 0 });
    expect(s.phase).toBe("countdown");
  });

  it("treats losing window focus as everyone letting go: countdown restarts", () => {
    let s = run(armed(), tick, tick);
    s = run(s, { type: "release_all", at: 0 });
    expect(s.tsugitashi.held.some(Boolean)).toBe(false);
    expect(s.countdown).toBe(COUNTDOWN_START);
  });

  it("treats losing window focus mid-round as letting go: held buttons lock in", () => {
    let s = run(playing(1000), up(0, 2000));
    s = run(s, { type: "release_all", at: 1000 + 3000 });
    expect(s.tsugitashi.locked[0]).toBe(counterAt(1000));
    expect(s.tsugitashi.locked[1]).toBe(counterAt(3000));
    expect(s.phase).toBe("video");
  });

  it("ignores losing focus in other modes", () => {
    const mash = run(createInitialState(), { type: "start" });
    expect(run(mash, { type: "release_all", at: 0 })).toBe(mash);
  });

  it("draws a target in range when play begins", () => {
    for (const random of [0, 0.5, 0.9999]) {
      const { target } = playing(1000, random).tsugitashi;
      expect(target).toBeGreaterThanOrEqual(TSUGITASHI_MIN_TARGET);
      expect(target).toBeLessThanOrEqual(TSUGITASHI_MAX_TARGET);
    }
  });

  it("locks in the shared counter when a player lets go, and ignores re-presses", () => {
    let s = playing(1000);
    s = run(s, up(0, 1000 + 3000));
    expect(s.tsugitashi.locked[0]).toBe(counterAt(3000));
    expect(s.tsugitashi.held[0]).toBe(false);
    s = run(s, down(0, 5000), up(0, 6000));
    expect(s.tsugitashi.locked[0]).toBe(counterAt(3000));
  });

  it("ends once everyone has let go", () => {
    let s = run(playing(1000), up(0, 2000), up(1, 2100), up(2, 2200));
    expect(s.phase).toBe("playing");
    s = run(s, up(3, 2300));
    expect(s.phase).toBe("video");
  });

  it("busts everyone still holding when the counter passes the target", () => {
    let s = run(playing(1000), up(0, 2000));
    s = run(s, { type: "time_up" });
    expect(s.phase).toBe("video");
    for (const id of [1, 2, 3])
      expect(s.tsugitashi.locked[id]).toBeGreaterThan(s.tsugitashi.target);
    expect(s.tsugitashi.locked[0]).toBeLessThanOrEqual(s.tsugitashi.target);
  });

  it("runs the round until the counter busts", () => {
    const s = playing(1000);
    expect(roundDuration(s)).toBeCloseTo(bustMs(s.tsugitashi.target));
  });
});

describe("ninja gauntlet", () => {
  const tick = (n: number): GameAction[] =>
    Array.from({ length: n }, () => ({ type: "gauntlet_tick", at: 0 }) as GameAction);
  const start = () =>
    run(createInitialState(), { type: "select_mode", mode: "gauntlet" }, { type: "start" });

  /** Plays the current non-kunai game to its results screen (nobody scores). */
  const finishGame = (s: GameState): GameState => {
    // Tsugitashi's countdown waits for everyone to hold their button
    const holds: GameAction[] =
      s.mode === "tsugitashi"
        ? ["KeyA", "KeyF", "KeyH", "KeyL"].map((code) => ({ type: "key_down", code, at: 0 }))
        : [];
    let t = run(s, ...holds);
    t = run(t, { type: "countdown_tick" }, { type: "countdown_tick" }, { type: "countdown_tick" });
    t = run(t, { type: "begin_play", at: 1000 }, { type: "time_up" });
    if (t.phase === "video") t = run(t, { type: "video_timeout" });
    return run(t, { type: "show_results", at: 5000 });
  };

  it("starts with the first game's countdown, not a lobby", () => {
    const s = start();
    expect(s.mode).toBe("mash");
    expect(s.phase).toBe("countdown");
    expect(s.countdown).toBe(COUNTDOWN_START);
    expect(s.gauntlet).toMatchObject({ index: 0, nextIn: null });
  });

  it("counts 5..1 after a game, then starts the next game's 3-2-1 at once", () => {
    let s = finishGame(start());
    expect(s.phase).toBe("results");
    expect(s.gauntlet?.nextIn).toBe(5);
    expect(s.gauntlet?.ranks).toHaveLength(1);
    s = run(s, ...tick(4));
    expect(s.gauntlet?.nextIn).toBe(1);
    expect(s.mode).toBe("mash");
    s = run(s, ...tick(1)); // the 1 is not followed by a 0
    expect(s).toMatchObject({ mode: "blind", phase: "countdown", countdown: COUNTDOWN_START });
    expect(s.gauntlet).toMatchObject({ index: 1, nextIn: null });
  });

  it("is not cut short by a mashed confirm key or a single Escape", () => {
    const s = finishGame(start());
    const lateEnter = run(s, { type: "key_down", code: "Enter", at: s.resultsShownAt + 5000 });
    expect(lateEnter.phase).toBe("results");
    const esc = run(s, { type: "key_down", code: "Escape", at: 0 });
    expect(esc.phase).toBe("results");
  });

  it("abandoning it returns to the menu with the gauntlet selected again", () => {
    const s = run(finishGame(start()), { type: "return_to_menu" });
    expect(s).toMatchObject({ phase: "menu", mode: "gauntlet", gauntlet: null });
  });

  it("takes Kunai's finish from the game itself, then moves on to the last game", () => {
    let s = finishGame(start());
    s = run(s, ...tick(5));
    s = finishGame(s);
    s = run(s, ...tick(5));
    s = finishGame(s);
    s = run(s, ...tick(5));
    expect(s).toMatchObject({ mode: "kunai", phase: "kunai" });
    s = run(s, { type: "kunai_finished", ranks: [1, 2, 3, 4] });
    expect(s.gauntlet?.nextIn).toBe(5);
    expect(s.gauntlet?.ranks[3]).toEqual([1, 2, 3, 4]);
    s = run(s, { type: "kunai_finished", ranks: [4, 3, 2, 1] }); // reported twice: ignored
    expect(s.gauntlet?.ranks[3]).toEqual([1, 2, 3, 4]);
    s = run(s, ...tick(5));
    expect(s).toMatchObject({ mode: "tsugitashi", phase: "countdown" });
  });

  it("shows the standings after the fifth game, then goes back to the menu", () => {
    let s = start();
    for (const game of ["mash", "blind", "stack", "kunai"]) {
      expect(s.mode).toBe(game);
      if (game === "kunai") {
        s = run(s, { type: "kunai_finished", ranks: [1, 2, 3, 4] });
      } else {
        s = finishGame(s);
      }
      s = run(s, ...tick(5));
    }
    expect(s.mode).toBe("tsugitashi");
    s = finishGame(s);
    expect(s.gauntlet?.nextIn).toBe(5);
    s = run(s, ...tick(5));
    expect(s).toMatchObject({ phase: "finale", mode: "gauntlet" });
    expect(s.gauntlet?.ranks).toHaveLength(5);
    const back = run(s, {
      type: "key_down",
      code: "Enter",
      at: s.resultsShownAt + RESULTS_INPUT_LOCK_MS,
    });
    expect(back).toMatchObject({ phase: "menu", mode: "gauntlet", gauntlet: null });
  });
});
