import type { NinjaColor } from "../game/types";
import { getColorImageUrl } from "./assets";

export const COLOR_OPTIONS: Record<
  NinjaColor,
  { label: string; color: string; glow: string; bgImage: string }
> = {
  red: {
    label: "Red",
    color: "#ff3b4e",
    glow: "rgba(255, 59, 78, 0.7)",
    bgImage: getColorImageUrl("red"),
  },
  green: {
    label: "Green",
    color: "#2ee6a0",
    glow: "rgba(46, 230, 160, 0.7)",
    bgImage: getColorImageUrl("green"),
  },
  blue: {
    label: "Blue",
    color: "#3fa9ff",
    glow: "rgba(63, 169, 255, 0.7)",
    bgImage: getColorImageUrl("blue"),
  },
  yellow: {
    label: "Yellow",
    color: "#ffc93c",
    glow: "rgba(255, 201, 60, 0.7)",
    bgImage: getColorImageUrl("yellow"),
  },
  orange: {
    label: "Orange",
    color: "#ff822d",
    glow: "rgba(255, 130, 45, 0.7)",
    bgImage: getColorImageUrl("orange"),
  },
  purple: {
    label: "Purple",
    color: "#bd4bff",
    glow: "rgba(189, 75, 255, 0.7)",
    bgImage: getColorImageUrl("purple"),
  },
};

export const AVAILABLE_COLORS = Object.keys(COLOR_OPTIONS) as NinjaColor[];
