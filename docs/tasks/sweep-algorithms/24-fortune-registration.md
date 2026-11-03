# 24 — Fortune registration (C5)

Status: planned 2026-11-03 (geometry handler 43). Source: [spec C5](../../specs/sweep-algorithms-lessons.md#c5-fortunes-algorithm-showpiece), [placement](../../specs/sweep-algorithms-lessons.md#placement). Kind: F2b, engineering review and browser smoke. Depends on 23. Pattern: [18 S2 registration](18-s2-registration.md).

## Scope

1. Register the Demonstration `fortune` ("Fortunov algoritem" / "Fortune's algorithm") in the Računska geometrija / Computational geometry family, at `/compgeo/fortune`.
   - Add the catalog entries, SL/EN titles and descriptions (one-shot lesson text rule for new strings), and the preset collection with Preset import validation for the 12-site and coordinate limits.
   - Put `fortune` in `CHAPTER_LINK_PENDING` until task 26, and in `POSTER_PENDING` with a recipe until a poster capture.
   - Recount the catalog and chapter test totals from their failure messages.
2. The default view frames the default example with equal units, and the sweep line starts above the highest site.
3. Smoke: the plain route and reload, the language switch, a preset round trip (save, reload, restore), and the Reset controls. Browser check at 1280×720 and 390×844.

Checks: `just unit` (focused, then full before the push), `npx tsc --noEmit --pretty false`, `just build`, `just smoke-built` for the catalog rows.
