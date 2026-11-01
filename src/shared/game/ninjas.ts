import { COLOR_OPTIONS } from "../config/colors";
import type { Ninja, NinjaColor } from "./types";

export function withColor(ninja: Ninja, colorName: NinjaColor): Ninja {
  const { color, glow, bgImage } = COLOR_OPTIONS[colorName];
  return { ...ninja, colorName, color, glow, bgImage };
}

type NinjaBase = Omit<Ninja, "color" | "glow" | "bgImage">;

const NINJA_BASES: readonly NinjaBase[] = [
  { id: 0, name: "Player 1", key: "A", code: "KeyA", colorName: "red" },
  { id: 1, name: "Player 2", key: "F", code: "KeyF", colorName: "green" },
  { id: 2, name: "Player 3", key: "H", code: "KeyH", colorName: "blue" },
  { id: 3, name: "Player 4", key: "L", code: "KeyL", colorName: "yellow" },
];

export const DEFAULT_NINJAS: Ninja[] = NINJA_BASES.map((base) =>
  withColor({ ...base, color: "", glow: "", bgImage: "" }, base.colorName),
);

export function assignColor(
  ninjas: readonly Ninja[],
  playerId: number,
  colorName: NinjaColor,
): Ninja[] {
  const target = ninjas.find((n) => n.id === playerId);
  if (!target || target.colorName === colorName) return [...ninjas];
  const holder = ninjas.find((n) => n.colorName === colorName);

  return ninjas.map((n) => {
    if (n.id === playerId) return withColor(n, colorName);
    if (holder && n.id === holder.id) return withColor(n, target.colorName);
    return n;
  });
}
