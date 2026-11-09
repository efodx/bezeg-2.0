# Graph-adjacent controls: phone prototype

**Status:** measured 2026-11-09, no source edited. Emulation only: Playwright Chromium, `isMobile`, `hasTouch`, DPR 1, locale `sl-SI`, no real device, browser chrome, safe areas, rotation or pinch zoom. Preview: production build of `fc9680af` at `http://localhost:4327/bezeg-2.0/`.
Script and data: `.command-logs/w3-s6-proto/proto.cjs`, `results.json`, `sum.cjs`, `run.log` (90 runs, all completed).

## Method

On each route the existing playback group node (`.inspector-playback` holding `[data-action="play-pause"]`) is moved (not cloned) into `div#proto-row` directly after `#jgbox` inside `section.workspace-graph`, normal flow. The group grid becomes `repeat(auto-fit, minmax(88px, 1fr))`. Variants:

- **A:** board height = `innerHeight - boardTop - rowHeight - 8` px (the `calc(100svh - X)` idea with X measured). Row only.
- **B:** board `55svh` (max-height 55svh) plus a `<details>` under the row ("Live") holding the first inspector range input's label (De Casteljau t, speed where present). Closed by default; summary 44px high.

Routes: fixed-point, bisection, geometric-series, decasteljau, arc-length, voronoi. Viewports: 390x844, 360x640, 320x640, 844x390 landscape, 390x844 with root font 200%. "Together" means every playback button fully on screen at scroll 0 (board visible area is then its on-screen height). Play then Pause was clicked via Playwright after the move; "toggled" means the button label/text/aria changed after Play.

Layout facts (read from `DemonstrationWorkspace.css`): the phone layout is `@media (max-width: 700px)`, one column, board `#jgbox` fixed `35vh`/min 260px; header plus workspace heading put the board top at 305-361 px (more on 200% text). Above 700px wide (including 844x390 landscape) the desktop grid is used and the board top is 337 px of a 390 px viewport.

## Results (board visible px / % of viewport; all buttons >=44x44 in every run; no document horizontal overflow in any run; exactly one `play-pause` node in every run)

"Base" = current layout (board 295 at 390x844, 260 at 360/320x640, buttons never together with the board).

| Viewport | Variant | fixed-point | bisection | geometric-series | decasteljau | arc-length | Row h | Together | Play/Pause after move |
|---|---|---|---|---|---|---|---|---|---|
| 390x844 | base | 295/33% | 295/33% | 295/33% | 295/33% | 295/33% | n/a | no | n/a |
| 390x844 | A | 473/52% | 473/52% | 424/47% | 478/53% | 478/53% | 53-57 | yes, all | works, scrollY stays 0 |
| 390x844 | B | 464/51% | 464/51% | 464/51% (row cut off, scrollY 29) | 464/51% | 464/51% | 105-109 | yes except geometric-series | works |
| 360x640 | base | 260/38% | 260/38% | 229/33% | 260/38% | 257/37% | n/a | no | n/a |
| 360x640 | A | 213/31% | 213/31% | 164/24% | 218/32% | 196/28% | 53-57 | yes, all | works, scrollY 0 |
| 360x640 | B | 279/40% | 279/40% | 229/33% | 279/40% | 257/37% | 105-109 | no, all five (page scrolled ~420-470 on click) | works but page scrolled |
| 320x640 | A | 137/20% | 165/24% | 120/17% | 170/24% | 120/17% | 53-57 | yes, all | works, scrollY 0 |
| 320x640 | B | 203/29% | 231/33% | 181/26% | 231/33% | 181/26% | 105-109 | no | scrolls |
| 844x390 landscape | A | 53/7% | 53/7% | 53/7% | 53/7% | 53/7% | 53 | no | works, but page scrolled 289 |
| 844x390 landscape | B | 53/7% | 53/7% | 53/7% | 53/7% | 53/7% | 105 | no | scrolls 384 |
| 390x844, 200% text | A | 212/23% | 267/30% | 120/13% | 244/27% | 147/16% | 58-92 | yes, all | works, scrollY 0 |
| 390x844, 200% text | B | 312/34% | 367/41% | 213/24% | 310/34% | 213/24% | 114-148 | no | scrolls 565-720 |

Voronoi: the moved group was the first `.inspector-playback` with `next-step` (4 buttons, row 102 at 390x844 A, 107 at 360x640, 147 at 200%); board 429/47%, 164/24%, 157/17% in A. There is no `play-pause` on Voronoi (the Playwright Play click timed out, so Play/Pause is not applicable); Voronoi has several `.inspector-playback` groups (triangles, sites, query move) and a rollout must decide which is "the" playback group. Not verified further.

Play then Pause: toggled correctly on fixed-point, bisection, geometric-series, decasteljau, arc-length in every variant and viewport, so the moved node keeps its React handlers. The page did not scroll in the A runs where the row was on screen (scrollY 0).

## Screenshots

`.command-logs/w3-s6-proto/`: `fixed-point__390x844__A.png`, `__B.png`, `fixed-point__360x640__A.png`, `__B.png`, and the same four for `decasteljau` and `arc-length` (12 files; name `<route>__<viewport>__<variant>.png`, full viewport at scroll 0, taken before pressing Play... after Play/Pause toggling, so the scene state is paused after one play). Not individually inspected beyond the measurements above.

## Findings and recommendation

- The dominant cost is the chrome above the board (305-361 px at phone widths, 437-631 at 320 / 200%), not the row. Variant A at 390x844 doubles the board area (295 to ~473 px, 52% of the viewport) with the row visible. At 360x640 the board is 164-218 px (24-32%), smaller than today's 260 px, but the buttons are now beside it; a board of about 200 px is the usable floor.
- **Recommended: Variant A** (board = viewport height minus board top minus row; row directly under the board, normal flow, no sticky), breakpoint `max-width: 700px` (the existing phone breakpoint), with a floor `min-height` of about 200 px on the board. Use `svh` units.
- **Live parameter/speed controls:** B's disclosure is not recommended as the default: it adds ~52 px, and at 360x640 or smaller it breaks simultaneous fit. Keep the disclosure collapsed and opt-in per route (De Casteljau t, speed) with the board height reduced by the summary; at <=390x844 the disclosure closed costs the A figures minus 52 px (board ~420 px). Opening it is a user choice; when open the page may scroll. Unmeasured: opened state and slider usability.
- **Fallback where simultaneous fit fails** (landscape: 844x390 board 53 px visible; 320 wide, 200% text, short heights): neither variant fits at scroll 0 because the header and heading alone fill the viewport. Do not use sticky. Use a `max-height` media condition (e.g. `(max-height: 500px)` in addition to `max-width: 700px`) to apply the same row placement plus a board minimum of about 200 px, and rely on the user scrolling the board+row block into view (board and row then fit together: 120+53 px at landscape after the page scroll). Also consider collapsing the workspace heading on short viewports; not tested. At 200% text, A still fits with 120-267 px boards and no overflow, but geometric-series and arc-length boards are small (120-147 px).
- Landscape is above 700 px wide, so the width breakpoint alone leaves it on the desktop grid; the row move must also key on height for phones.

## Gaps

Emulation only; no real browser chrome (address bar changes `100svh`), no safe-area insets, no real rotation. Variant A's X was computed once per page from the measured board top, not live CSS (`calc(100svh - X)` needs a custom property or a flex layout in real code). Landscape/200% fallback is inferred, not measured after scrolling. Disclosure open state, Voronoi group choice, euler-method, lessons, Presentation mode, focus retention, and screenshot content were not checked.
