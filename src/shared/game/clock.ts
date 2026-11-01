import type { Clock } from "./types";

export function createClock(initial: number): Clock {
  let value = initial;
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => value,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (next) => {
      if (next === value) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
  };
}
