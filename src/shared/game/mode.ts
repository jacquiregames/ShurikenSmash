import type { GameMode } from "./types";

/**
 * Static facts about a game mode. Every mode folder exports one of these from its
 * `meta.ts`, and `modes/registry.ts` is the only place that lists them all.
 */
export interface ModeMeta {
  id: GameMode;
  /** Heading text (and image alt text). */
  title: string;
  /** Label on the menu tab. */
  menuLabel: string;
  /** Modes without logo/rules art fall back to the title and the `rules` text. */
  logoImage?: string;
  rulesImage?: string;
  rules?: readonly string[];
  /** Round length in ms. Omitted by self-contained modes that run their own clock (Kunai). */
  roundMs?: number;
  /** Whether the round ends with the win/lose videos and art. */
  usesOutcomeMedia: boolean;
}
