import { getImageUrl } from "../../../shared/config/assets";
import type { Ninja } from "../../../shared/game/types";

/* ============================================================
   Tuning, scoring and player roster for Kunai Bullseye.
   The aim bar runs from -1 (far left) to +1 (far right).
   A normalised |pos| of MATO_D is exactly the rim of the target.
   ============================================================ */

/** A seat in the match: the menu's ninja, re-seated 0..N-1, with the Kunai card art. */
export interface KunaiPlayer extends Ninja {
  /** Seat label, "P1".."P4". */
  label: string;
}

/** Builds the match roster from the ninjas that are playing. */
export function buildKunaiPlayers(ninjas: readonly Ninja[]): KunaiPlayer[] {
  return ninjas.map((n, i) => ({
    ...n,
    id: i,
    label: `P${i + 1}`,
    glow: "rgba(255, 255, 255, 0.4)",
    bgImage: getImageUrl(`kunai/${n.colorName}`),
  }));
}

export const ROUNDS = 3;

/** marker travel speed (normalised bar-lengths per second) per round */
export const SPEED = [0.78, 1.22, 1.78];

/** seconds on the fuse per round */
export const ROUND_TIME = [11, 9.5, 8];

/** |pos| that lands exactly on the target rim */
export const MATO_D = 0.45;

/** half-length of the bar in centimetres, for flavour readouts */
export const BAR_CM = 26;

/** beyond this the kunai is stuck in the backboard: no points */
export const REACH = 0.62;

/** flight time of a thrown kunai, ms */
export const FLIGHT_MS = 520;

/**
 * The painted target, measured off the art (800px across, so a radius of 400px). Rings run
 * from the bullseye outwards: `outer` is the ring's outer edge in px from the centre, and
 * `hi`..`lo` the points it pays from its inner edge to its outer edge. The aim track draws
 * the same rings, so what you see on the track is what you score.
 */
export const TARGET_RADIUS_PX = 400;

export const TARGET_RINGS = [
  { zone: "bull", color: "#0046ec", outer: 38, hi: 100, lo: 100 },
  { zone: "red", color: "#d20000", outer: 91, hi: 99, lo: 90 },
  { zone: "white", color: "#d4d3d3", outer: 141, hi: 89, lo: 80 },
  { zone: "blueIn", color: "#003e5c", outer: 189, hi: 79, lo: 70 },
  { zone: "yellow", color: "#eabf00", outer: 239, hi: 69, lo: 60 },
  { zone: "blueOut", color: "#003e5c", outer: 291, hi: 59, lo: 50 },
  { zone: "orange", color: "#d74000", outer: 352, hi: 49, lo: 40 },
  { zone: "rim", color: "#272827", outer: 400, hi: 29, lo: 10 },
] as const;

export type ZoneKey = (typeof TARGET_RINGS)[number]["zone"] | "wood" | "off";

/** |pos| of a point `px` pixels from the target's centre */
const toD = (px: number) => (px / TARGET_RADIUS_PX) * MATO_D;

/** the blue dot: anything this tight is a bullseye */
export const BULLSEYE_D = toD(TARGET_RINGS[0].outer);

/** Points on the backboard (between the rim and REACH) fall from here to 1. */
const WOOD_TOP = 9;

export function zoneFor(d: number): ZoneKey {
  const ring = TARGET_RINGS.find((r) => d <= toD(r.outer));
  if (ring) return ring.zone;
  return d < REACH ? "wood" : "off";
}

export function scoreFor(d: number): number {
  if (d <= BULLSEYE_D) return 100;
  if (d >= REACH) return 0;

  let inner = BULLSEYE_D;
  for (const ring of TARGET_RINGS) {
    const outer = toD(ring.outer);
    if (d <= outer) {
      const t = (d - inner) / (outer - inner);
      return Math.round(ring.hi + (ring.lo - ring.hi) * t);
    }
    inner = outer;
  }
  const t = (d - MATO_D) / (REACH - MATO_D);
  return Math.max(1, Math.round(WOOD_TOP - (WOOD_TOP - 1) * t));
}
