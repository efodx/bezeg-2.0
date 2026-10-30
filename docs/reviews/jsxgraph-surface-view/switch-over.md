# JSXGraph surface view: switch-over and acceptance (task 07)

Date: 2026-10-30. Closes [task 07](../../tasks/jsxgraph-surface-view/07-switch-over.md) and spec criteria 7–9 of [the JSXGraph surface view](../../specs/jsxgraph-surface-view.md). Host: Windows 11, Ryzen 5 7600, headless Chromium (Playwright). Earlier records: [gate](gate.md), [interaction](interaction.md), [labels and export](labels-export.md), [03D measurements](measure-2026-10-30-03d.md).

## Commits

| Commit | Change |
| --- | --- |
| `3ea1645` (07A) | `JsxSurfaceView` is the only view. Deleted `threeSurfaceView.ts` and its tests, `three`/`@types/three`, `VITE_SURFACE_VIEW`, `AttachOptions.onContextLost/Restored`. `surface_unavailable` (sl/en) no longer mentions WebGL. |
| `93144f4` (07B) | The view publishes `data-surface-framing` again (full-detail frames only, cached). |
| `b625888` (07B) | Smoke and capture helpers check the SVG view, not a WebGL canvas (`scripts/surface-view-evidence.cjs`). |
| `692eb27` (07B) | Six patch posters and orbit clips (FFmpeg 7.0.2) and eleven patch guided-example PNGs recaptured with geometry-checked frames. |
| `31a9d06` (07C) | Two-finger pinch zoom restored (see below). |

## Removal and bundle (criterion 8)

`three` and `@types/three` are gone from `package.json`. Production build, all `assets/*.js`: 6,275,304 → 5,558,573 B (−716,731 B; gzip −179,095 B), almost all of it the lazily loaded `three.module` chunk (694,911 B). These are whole-build totals, not traced per route; the patch routes were the only importers of that chunk. Hosting needs no change: the app stays static and one chunk fewer is served.

## Verification

- CI (Browser smoke, including deploy): `b625888`, `692eb27`, `855db44` green. (`3ea1645` was red because the smoke helpers still expected a canvas; `b625888` fixed them.)
- Local at `31a9d06` (dirty only in these docs): `just check` passed (type, lint, unit, build); `just build`; `just smoke-built` passed (every spec except guided lessons, 190 s); `just smoke-lesson` for the eleven patch rows, 22 tests (Slovenian desktop walk and English 390 px walk each), all passed. These are the bilingual patch walks of criterion 7.
- Surface-view unit tests: 80 passed (11 files), including the new pinch test.

### Manual smoke checklist (07C)

One `bezeg-smoke` worker (Sonnet 5.5, medium) on a production preview of `855db44`, 1440×1000 and 390×844, fresh contexts, about 40 min.

| Check | Result |
| --- | --- |
| Six patch routes at both widths: heading, one SVG surface and net, no canvas, no horizontal overflow, no console errors; every control point in the default framing at 390 | passed |
| Mouse drag on tensor and triangular: plain drag moves x, y only; Shift or the height switch moves z only; camera unchanged during and after | passed |
| Touch: one-finger point drag (x, y) and one-finger orbit | passed |
| Touch: two-finger pinch zoom | **failed** at `855db44`; fixed in `31a9d06`, rechecked below |
| Mouse orbit, wheel, arrow and +/− keys, Top preset and Reset view | passed |
| Numeric x/y/z editor moves the point and redraws the surface | passed (invalid-input alert not reachable: number inputs) |
| PNG export (1002×660, decodes) and SVG export (parses; one raster `<image>` plus vector MathJax glyphs) | passed |
| Preset save, change, reopen (net and camera identical), delete | passed |
| Language SL → EN → SL with an edited point: labels change, geometry and board kept | passed |
| Navigation tensor → triangular → joins → tensor, twice: one view, `JXG.boards` steady at 2, no label growth, edits still work | passed |
| Keyboard at 390: focus ring, language select and panel controls operable | passed |

### Pinch regression (fixed)

The Three view zoomed on a two-finger pinch; the JSX view had no two-pointer handling, so touch readers could not zoom. The interaction review had listed pinch only as unverified. `31a9d06` ports the Three behaviour into `JsxInteraction`: a second press on empty space during an orbit drag becomes a pinch, and lifting either finger ends it without resuming the orbit. A second finger during a point drag is left to JSXGraph. Browser check on the `31a9d06` build (CDP touch, 390 and 1440 wide): spreading the fingers from 40 to 200 px zoomed distance 17.37 → 3.47; pinching back returned 17.37; moving the remaining finger after one lift did not orbit; a new one-finger drag orbited (az −0.9 → −1.3); no page errors.

## Measurements on the integrated build

Rendering code is that of the 03D record plus framing publication (`93144f4`) and input-only changes. The 03D sustained-rate probe (`measure-rate.mjs`) rerun on the `31a9d06` build, 3 rounds × 3 repetitions:

| Cell | Draws/s (range) | 03D median |
| --- | --- | --- |
| teapot, desktop 1440×1000 | 28.2–29.2 | 28.8 |
| teapot, narrow 390×844 | 28.7–29.2 | 29.0 |
| tensor density 16, desktop | 50.5–54.0 | 53.0 |

The teapot stays at the probe's input ceiling (about 30 draws/s), and tensor frame intervals have median 16.7 ms, p95 18.4–19.2 ms. Framing publication costs no measurable rate. The app-route latency table (`measure-app.mjs`) was not rerun: its Three reference needs a build before `3ea1645`, and the board2d rows were measured at rendering code identical to this build.

## User-visible changes

No route, Preset format or lesson changes; stored Presets open unchanged (Preset restore and the lesson walks above).

- **Look.** Patch views are drawn by JSXGraph in SVG with the 2D curve tokens: flat-shaded faces, cream background, the same point and line style as the curve graphs. Surface orbit clips now show the cream background (the Three clear colour was white).
- **Drag.** A control point drag stops at the faces of a cube around the camera target (half side `max(2, 1.25 ×` farthest scene extent)); the Three view had no limit. Vertical drag moves only z along the point's vertical line.
- **Touch picking.** A finger picks the nearest point within JSXGraph's 30 px tolerance, so on a dense net at 390 px a neighbour can be grabbed; the numeric editor is the exact path.
- **Labels.** Control points no longer hide labels (labels are tested against the surface only).
- **Export.** PNG and SVG export have no tainted-canvas failure. The figure SVG still embeds the surface as a raster with vector labels.
- **Animation.** The stroke-width toggle no longer animates.
- **Failure.** WebGL is no longer needed; the `surface_unavailable` alert now asks for a page reload.

## Known limits

- The derivatives and triangular-split guided examples have crowded labels (`S_u`, `S_v`, `n` near `S(u,v)`); this is the task 05 label layout, unchanged by the switch-over.
- At 390 px the default framing fits every control point but leaves the patch small on the board.
- Not verified: real touch devices (iOS/Android), stylus, Firefox and Safari, screen readers, editing on the subdivision and joins routes in the browser (unit-tested), and pinch that starts during a point drag.
