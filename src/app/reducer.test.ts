import { describe, expect, it } from "vitest";
import { COUNTDOWN_START, RESULTS_INPUT_LOCK_MS } from "../shared/config/timing";
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

  it("ends the round once every active player has struck", () => {
    let s = playing("blind");
    for (const code of ["KeyA", "KeyF", "KeyH", "KeyL"]) {
      s = run(s, { type: "key_down", code, at: 5000 });
    }
    expect(s.phase).toBe("video");
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

  it("Escape aborts to the menu", () => {
    expect(run(playing(), { type: "key_down", code: "Escape", at: 0 }).phase).toBe("menu");
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
    expect(run(s, { type: "key_down", code: "Escape", at: 0 }).phase).toBe("menu");
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
    expect(usesOutcomeMedia("mash")).toBe(true);
    expect(usesOutcomeMedia("blind")).toBe(true);
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
