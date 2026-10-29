import { describe, expect, it } from "vitest";
import { BAKUDAN_MAX_MS, BAKUDAN_MIN_MS, GAME_MS, RESULTS_INPUT_LOCK_MS } from "./config";
import type { GameMode } from "./types";
import { assignColor, DEFAULT_NINJAS } from "./ninjas";
import { createInitialState, gameReducer, type GameAction, type GameState } from "./reducer";

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
      { type: "key_down", code: "KeyQ", at: 1300 }
    );
    expect(s.counts).toEqual([2, 0, 0, 0]);
  });

  it("ignores presses after time has elapsed", () => {
    const s = run(playing(), { type: "key_down", code: "KeyA", at: 1000 + GAME_MS });
    expect(s.counts[0]).toBe(0);
  });

  it("ignores the 4th player's key in a 3-player game", () => {
    let s = createInitialState();
    s = run(s, { type: "select_player_count", count: 3 }, { type: "start" });
    s = run(s, { type: "countdown_tick" }, { type: "countdown_tick" }, { type: "countdown_tick" });
    s = run(s, { type: "begin_play", at: 0 }, { type: "key_down", code: "KeyL", at: 10 });
    expect(s.counts[3]).toBe(0);
  });
});

describe("blind", () => {
  it("records remaining time from the event timestamp and locks the player", () => {
    const s = run(
      playing("blind"),
      { type: "key_down", code: "KeyA", at: 1000 + 9_000 },
      { type: "key_down", code: "KeyA", at: 1000 + 9_500 }
    );
    expect(s.strikeTimes[0]).toBeCloseTo(1, 5);
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
      run(s, { type: "key_down", code: "Enter", at: 5000 + RESULTS_INPUT_LOCK_MS }).phase
    ).toBe("menu");
  });

  it("Escape aborts to the menu", () => {
    expect(run(playing(), { type: "key_down", code: "Escape", at: 0 }).phase).toBe("menu");
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
describe("bakudan", () => {
  const CODES = ["KeyA", "KeyF", "KeyH", "KeyL"];
  const press = (s: GameState, id: number, at = (s.startedAt ?? 0) + 100) =>
    run(s, { type: "key_down", code: CODES[id], at });

  it("lights a hidden 10–20s fuse and hands the bomb to someone", () => {
    for (const at of [0, 1234.5, 98765.4321]) {
      const s = playing("bakudan", at);
      expect(s.roundMs).toBeGreaterThanOrEqual(BAKUDAN_MIN_MS);
      expect(s.roundMs).toBeLessThan(BAKUDAN_MAX_MS);
      expect(s.holder).not.toBeNull();
    }
  });

  it("passes the bomb around the loop, wrapping to the first player", () => {
    let s: GameState = { ...playing("bakudan"), holder: 2 };
    s = press(s, 2);
    expect(s.holder).toBe(3);
    s = press(s, 3);
    expect(s.holder).toBe(0);
  });

  it("eliminates a player who presses without the bomb, and skips them afterwards", () => {
    let s: GameState = { ...playing("bakudan"), holder: 0 };
    s = press(s, 1);
    expect(s.alive[1]).toBe(false);
    expect(s.knockouts).toEqual([{ playerId: 1, round: 1, cause: "fumble" }]);
    expect(s.phase).toBe("playing");
    s = press(s, 0);
    expect(s.holder).toBe(2);
    expect(press(s, 1)).toBe(s);
  });

  it("blows up the holder when time runs out, then plays another round", () => {
    let s: GameState = { ...playing("bakudan"), holder: 3 };
    s = run(s, { type: "time_up" });
    expect(s.phase).toBe("boom");
    expect(s.alive[3]).toBe(false);
    expect(s.knockouts.at(-1)).toEqual({ playerId: 3, round: 1, cause: "boom" });

    s = run(s, { type: "next_round" });
    expect(s.phase).toBe("countdown");
    expect(s.round).toBe(2);
    s = run(s, { type: "countdown_tick" }, { type: "countdown_tick" }, { type: "countdown_tick" });
    s = run(s, { type: "begin_play", at: 50_000 });
    expect(s.holder).not.toBe(3);
  });

  it("ends the match when one ninja is left", () => {
    let s: GameState = { ...playing("bakudan"), holder: 0 };
    s = press(s, 1);
    s = press(s, 2);
    s = press(s, 3);
    expect(s.phase).toBe("boom");
    s = run(s, { type: "next_round" });
    expect(s.phase).toBe("video");
  });
});
