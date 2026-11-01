import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_NINJAS } from "../../../shared/game/ninjas";
import { FLIGHT_MS, ROUNDS, ROUND_TIME, buildKunaiPlayers } from "./config";
import { createEngine } from "./engine";

const silent = {
  count: () => {},
  throwSfx: () => {},
  lock: () => {},
  hit: () => {},
  fuseTick: () => {},
  roundUp: () => {},
  victory: () => {},
  unlock: () => {},
};

function setup(seats = 2) {
  const players = buildKunaiPlayers(DEFAULT_NINJAS.slice(0, seats));
  // random() = 0.5 puts every marker at exactly 0 (dead centre) before it moves.
  return createEngine(players, { random: () => 0.5, sfx: silent });
}

/** Runs the pre-round countdown to completion. */
const goLive = (e: ReturnType<typeof setup>) => {
  e.start();
  vi.advanceTimersByTime(2600);
};

describe("kunai engine", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts on the title screen", () => {
    expect(setup().getSnapshot().phase).toBe("title");
  });

  it("counts down 3-2-1 and then goes live", () => {
    const e = setup();
    e.start();
    expect(e.getSnapshot()).toMatchObject({ phase: "countdown", count: 3, round: 1 });
    vi.advanceTimersByTime(750);
    expect(e.getSnapshot().count).toBe(2);
    vi.advanceTimersByTime(1900);
    expect(e.getSnapshot()).toMatchObject({ phase: "live", count: 0 });
    expect(e.getSnapshot().runs.every((r) => r.status === "aiming")).toBe(true);
  });

  it("ignores throws before the round is live", () => {
    const e = setup();
    e.start();
    e.press(0);
    expect(e.getSnapshot().runs[0].status).toBe("waiting");
  });

  it("a throw at dead centre is a bullseye worth 100", () => {
    const e = setup();
    goLive(e);
    e.press(0);
    expect(e.getSnapshot().runs[0]).toMatchObject({ status: "flying", points: 100, bull: true });
    vi.advanceTimersByTime(FLIGHT_MS + 1);
    expect(e.getSnapshot().runs[0].status).toBe("landed");
    expect(e.getSnapshot().banner?.title).toBe("BULLSEYE");
  });

  it("can only throw once per round", () => {
    const e = setup();
    goLive(e);
    e.press(0);
    const id = e.getSnapshot().runs[0].throwId;
    e.press(0);
    expect(e.getSnapshot().runs[0].throwId).toBe(id);
  });

  it("markers bounce off the ends of the bar", () => {
    const e = setup();
    goLive(e);
    for (let i = 0; i < 200; i++) e.step(0.05);
    e.press(0);
    expect(Math.abs(e.getSnapshot().runs[0].pos)).toBeLessThanOrEqual(1);
  });

  it("auto-throws for anyone still aiming when the fuse runs out", () => {
    const e = setup();
    goLive(e);
    for (let i = 0; i < ROUND_TIME[0] * 20 + 5; i++) e.step(0.05);
    const runs = e.getSnapshot().runs;
    expect(runs.every((r) => r.status === "flying" && r.auto)).toBe(true);
  });

  it("scores a round, then starts the next with fresh runs", () => {
    const e = setup();
    goLive(e);
    e.press(0);
    e.press(1);
    vi.advanceTimersByTime(FLIGHT_MS + 1100);
    expect(e.getSnapshot()).toMatchObject({ phase: "roundEnd", totals: [100, 100] });
    vi.advanceTimersByTime(2900 + 10);
    expect(e.getSnapshot()).toMatchObject({ phase: "countdown", round: 2 });
    expect(e.getSnapshot().runs.every((r) => r.status === "waiting")).toBe(true);
    expect(e.getSnapshot().history).toHaveLength(1);
  });

  it("plays a whole match through to game over", () => {
    const e = setup();
    e.start();
    for (let round = 1; round <= ROUNDS; round++) {
      vi.advanceTimersByTime(2600);
      e.press(0); // seat 0 hits dead centre; seat 1 is auto-thrown when the fuse burns out
      for (let i = 0; i < ROUND_TIME[round - 1] * 20 + 5; i++) e.step(0.05);
      vi.advanceTimersByTime(FLIGHT_MS + 1100 + 1);
      if (round < ROUNDS) vi.advanceTimersByTime(3000);
    }
    vi.advanceTimersByTime(3000);
    const s = e.getSnapshot();
    expect(s.phase).toBe("gameOver");
    expect(s.winners).toEqual([0]);
  });

  it("notifies subscribers and stops after unsubscribe", () => {
    const e = setup();
    const fn = vi.fn();
    const off = e.subscribe(fn);
    e.start();
    expect(fn).toHaveBeenCalled();
    off();
    fn.mockClear();
    vi.advanceTimersByTime(800);
    expect(fn).not.toHaveBeenCalled();
  });

  it("writes marker position straight to the DOM element", () => {
    const e = setup();
    const el = { style: { setProperty: vi.fn() } } as unknown as HTMLElement;
    e.setMarkerEl(0, el);
    goLive(e);
    e.step(0.1);
    expect(el.style.setProperty).toHaveBeenCalledWith("--pos", expect.any(String));
  });
});
