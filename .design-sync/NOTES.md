# design-sync notes — mechiron

Repo-specific gotchas. Read this before re-syncing.

## This repo is an app, not a DS package

- There is no `dist/` and no published package, so the converter runs in
  **synth-entry mode**: `cfg.srcDir = src/components/ui` and every PascalCase
  export under it becomes a component (12 of them).
- `--entry ./src/components/ui/index.tsx` is passed **even though that file
  does not exist**. The path is only used to locate `PKG_DIR` by walking up to
  the repo's `package.json`; without it the converter looks for
  `node_modules/mechiron` and dies with ENOENT. The `[NO_DIST]` line it prints
  is expected, not a failure.
- Consequence: prop extraction has no `.d.ts` tree to read and emits
  `[key: string]: unknown` for every component. **`cfg.dtsPropsFor` carries
  all 12 prop contracts by hand.** If a component's props change in
  `src/components/ui/`, update `dtsPropsFor` too — nothing checks this for you.

## Stylesheet is generated, not committed by the app

`src/app/globals.css` is two lines; Tailwind v4 generates utilities at build
time and the app applies Heebo via `next/font` on `<html>`. Neither reaches a
design system. So:

- `.design-sync/ds-entry.css` is the real input (committed). Recompile with:
  ```sh
  node .ds-sync/node_modules/@tailwindcss/cli/dist/index.mjs \
    -i .design-sync/ds-entry.css -o .design-sync/ds-tailwind.css
  ```
  Do this whenever app source adds new utility classes, then rebuild.
- It scans `../src` **and `../.design-sync/previews`** — a class used only in a
  preview is otherwise never compiled. That bug cost one debugging cycle
  (Skeleton's `rounded-full` / `h-20 w-32` silently vanished).
- It carries a **`@source inline(...)` safelist**. Designs built in
  claude.ai/design are new code the sheet never scanned, so without it the
  agent's own layout classes resolve to nothing. Output is ~477 KB. The
  safelist defines the vocabulary documented in `conventions.md` — **keep the
  two in sync**; widening one without the other makes the docs lie.

## Fonts

Heebo woff2s are vendored in `.design-sync/fonts/` (committed, ~100 KB),
harvested from `.next/dev/static/chunks/[next]_internal_font_google_heebo_*.css`
after a dev build, with the `Heebo Fallback` rule dropped. `ds-entry.css`
overrides `--font-sans` so Heebo is the default family. If the font subsets
change, re-harvest from a fresh Next build.

## No provider needed

`StatusBadge` calls `useT()`, but the i18n context has a **working Hebrew
default**, so it renders correctly with no `cfg.provider`. Don't add one —
`LocaleProvider` lives outside `src/components/ui` and isn't in the bundle.

## Known render warns (expected — not new)

- `[GRID_OVERFLOW] … Modal.html … (fixed/portal)` — **triaged, do not "fix"
  by applying the suggested `cardMode: single`.** `Modal` is `fixed inset-0`,
  which the checker detects statically. The authored preview wraps it in a
  `Stage` div with `transform: translateZ(0)`, creating a containing block, so
  both cells render fully inside their cards (verified in
  `_screenshots/review/general__Modal.png`). Applying `single` would drop a
  good cell for no gain. Re-check the screenshot if the warn text changes.

## Re-sync risks

- **`dtsPropsFor` is hand-maintained** and can silently drift from
  `src/components/ui/*.tsx`. Diff them when a component's API changes.
- **The Tailwind safelist is a guess at what designers will use.** If designs
  come back unstyled, the missing class is probably outside it — widen the
  safelist in `ds-entry.css` AND the table in `conventions.md`, recompile,
  rebuild.
- **Fonts are a snapshot** of a `.next` build, not a live dependency. A Next or
  font-subset upgrade won't propagate on its own.
- The conventions header's class names were validated against
  `_ds_bundle.css` at sync time. Re-run that check after any safelist change.
- Playwright chromium lives in `.ds-sync/node_modules` + `~/.cache/ms-playwright`
  (~200 MB); a fresh clone needs `npm i playwright && npx playwright install chromium`.
- `.design-sync/previews/*.tsx` import from `'mechiron'` — the package name
  from `package.json`. Renaming the package breaks every preview.
