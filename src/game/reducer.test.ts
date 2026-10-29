import { describe, expect, it } from "vitest";
import { GAME_MS, RESULTS_INPUT_LOCK_MS } from "./config";
import { assignColor, DEFAULT_NINJAS } from "./ninjas";
import { createInitialState, gameReducer, type GameAction, type GameState } from "./reducer";

const run = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state);

function playing(mode: "mash" | "blind" = "mash", startedAt = 1000): GameState {
  let s = createInitialState();
  s = run(s, { type: "select_mode", mode }, { type: "start" });
  s = run(s, { type: "countdown_tick" }, { type: "countdown_tick" }, { type: "countdown_tick" });
  return run(s, { type: "begin_play", at: startedAt });
}

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

  it("ignores presses stamped before play began", () => {
    const s = run(playing(), { type: "key_down", code: "KeyA", at: 999.5 });
    expect(s.counts[0]).toBe(0);
  });

  it("counts a press stamped just before the deadline", () => {
    const s = run(playing(), { type: "key_down", code: "KeyA", at: 1000 + GAME_MS - 0.1 });
    expect(s.counts[0]).toBe(1);
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

  it("rounds strike times to whole milliseconds", () => {
    const s = run(
      playing("blind"),
      { type: "key_down", code: "KeyA", at: 1000 + 9_957.7 },
      { type: "key_down", code: "KeyF", at: 1000 + 9_958.2 }
    );
    expect(s.strikeTimes[0]).toBe(0.042);
    expect(s.strikeTimes[1]).toBe(0.042);
  });

  it("does not spend a player's one strike on a press stamped before play began", () => {
    const s = run(
      playing("blind"),
      { type: "key_down", code: "KeyA", at: 999 },
      { type: "key_down", code: "KeyA", at: 1000 + 9_000 }
    );
    expect(s.strikeTimes[0]).toBe(1);
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