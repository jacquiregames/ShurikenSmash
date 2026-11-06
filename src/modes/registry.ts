import type { ModeMeta } from "../shared/game/mode";
import type { GameMode } from "../shared/game/types";
import { blindMeta } from "./blind/meta";
import { gauntletMeta } from "./gauntlet/meta";
import { kunaiMeta } from "./kunai/meta";
import { mashMeta } from "./mash/meta";
import { stackMeta } from "./stack/meta";
import { tsugitashiMeta } from "./tsugitashi/meta";

/** Every mode, keyed by id. The `satisfies` makes adding a `GameMode` without an entry a type error. */
export const MODE_BY_ID = {
  mash: mashMeta,
  blind: blindMeta,
  tsugitashi: tsugitashiMeta,
  stack: stackMeta,
  kunai: kunaiMeta,
  gauntlet: gauntletMeta,
} satisfies Record<GameMode, ModeMeta>;

/** Menu order. */
export const MODES: readonly ModeMeta[] = Object.values(MODE_BY_ID);

export const modeMeta = (mode: GameMode): ModeMeta => MODE_BY_ID[mode];

/** Round length for a timed mode (0 for self-timed modes, which never ask). */
export const roundMsFor = (mode: GameMode): number => MODE_BY_ID[mode].roundMs ?? 0;

export const usesOutcomeMedia = (mode: GameMode): boolean => MODE_BY_ID[mode].usesOutcomeMedia;
