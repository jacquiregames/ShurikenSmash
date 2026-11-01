import { useEffect, useState, useSyncExternalStore } from "react";
import { createEngine } from "./engine";
import type { KunaiPlayer } from "./config";

/** Runs one Kunai match. `players` is fixed for the life of the match. */
export function useEngine(players: readonly KunaiPlayer[]) {
  const [engine] = useState(() => createEngine(players));
  // The frame loop and pending timers live exactly as long as the component does.
  useEffect(() => engine.mount(), [engine]);
  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  return { engine, state };
}
