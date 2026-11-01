# Ninja Dojo — architecture

```
src/
  shared/   game types, ranking, audio context, shared components, tokens/fonts/global CSS
  modes/    one folder per game mode + registry.ts (the only file that sees every mode)
  app/      menu, reducer, hooks and the shell that wires modes together
tests/      architecture.test.ts enforces the layering below
```

**Layering:** `shared` ← `modes/*` ← `app`. Shared never imports modes or the app; a mode imports only
itself and shared (never a sibling mode). `npm test` fails if this is broken.

## A mode's folder

| file             | role                                                                |
| ---------------- | ------------------------------------------------------------------- |
| `meta.ts`        | id, menu label, title, rules, round length, uses win/lose media     |
| `logic.ts`       | pure functions over the mode's own state slice (`GameState.<mode>`) |
| `results.ts`     | turns the slice into `RoundResults` (ranks, labels, winners)        |
| `<Mode>Card.tsx` | the player card, built on `PlayerCardShell`                         |
| `<mode>.css`     | styles for that mode only                                           |

## Adding a mode

1. Add its id to `GameMode` in `shared/game/types.ts`.
2. Create `modes/<id>/` with the files above.
3. Add its `meta` to `MODE_BY_ID` in `modes/registry.ts` (the `satisfies` clause errors until you do).
4. Add its state slice to `app/state.ts`, and call its logic from `app/reducer.ts` and `app/results.ts`.
5. Render its card in `app/PlayerCards.tsx`.

Kunai Bullseye is self-contained: `game/engine.ts` is a plain state machine (`createEngine`) that React
subscribes to; per-frame marker and fuse movement writes straight to the DOM.

## Fonts

Tokens live in `shared/styles/tokens.css`: `--font-display` (Bangers), `--font-body` (Rajdhani) and
`--font-name` (Painting With Chocolate, used for player names). Zen Kaku Gothic New is the self-hosted
kanji fallback for all three. Everything is bundled; there are no Google Fonts requests.

## Scripts

`npm run dev | build | test | lint | typecheck | format | format:check`
