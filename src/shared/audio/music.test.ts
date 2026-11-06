import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const play = vi.fn(() => Promise.resolve());
const pause = vi.fn();
const instances: { loop: boolean; paused: boolean; src: string }[] = [];

class FakeAudio {
  loop = false;
  volume = 1;
  preload = "";
  paused = true;
  src: string;
  constructor(src: string) {
    this.src = src;
    instances.push(this);
  }
  play() {
    this.paused = false;
    return play();
  }
  pause() {
    this.paused = true;
    pause();
  }
}

async function load(stored?: string) {
  vi.resetModules();
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("localStorage", {
    getItem: () => stored ?? null,
    setItem: vi.fn(),
  });
  return import("./music");
}

describe("background music", () => {
  beforeEach(() => {
    instances.length = 0;
    play.mockClear();
    pause.mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("loops music.mp3 once started, and starting again does not restart it", async () => {
    const m = await load();
    m.startMusic();
    m.startMusic();
    const [el] = instances;
    expect(instances).toHaveLength(1);
    expect(el.loop).toBe(true);
    expect(el.src).toMatch(/music\.mp3$/);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("toggles off and on, telling subscribers", async () => {
    const m = await load();
    const listener = vi.fn();
    m.subscribeMusic(listener);
    m.startMusic();
    m.toggleMusic();
    expect(m.isMusicOn()).toBe(false);
    expect(pause).toHaveBeenCalled();
    m.startMusic(); // a stray key press must not bring it back
    expect(play).toHaveBeenCalledTimes(1);
    m.toggleMusic();
    expect(m.isMusicOn()).toBe(true);
    expect(play).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("remembers having been switched off", async () => {
    const m = await load("off");
    expect(m.isMusicOn()).toBe(false);
    m.startMusic();
    expect(play).not.toHaveBeenCalled();
  });
});
