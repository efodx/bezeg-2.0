# Keep demonstration playback beside the graph

**Status:** done 2026-11-10 in [Controls](../feature-streams/controls.md) step 6.
**Source spec:** [Mobile graph playback](../../specs/mobile-graph-playback.md).

## Outcome

Phone users can operate animation and iterative playback while watching the graph on every demonstration that supports it. Fixed-point is one reproduction example. Recommended solution: a shared compact playback row directly beneath the graph, with sufficient graph and control space in the same viewport and each demonstration's supported actions. Do not default to automatic scrolling.

## Work

1. Inventory all active playback routes, supported actions, live parameter/speed controls, and shared hosts. Start from fixed-point, bisection, sequence convergence, and both De Casteljau integrations identified in the source spec; confirm route mappings and find any others. Reproduce the scroll journey on representative iterative and continuous animations in a production build. Record viewport, browser, board dimensions, and before screenshots. Inspect current master before implementation; workspace and lesson files had unrelated in-progress changes when this task was prepared.
2. Prototype the graph-adjacent row at 390 × 844 and 360 × 640, plus short landscape and enlarged text. Establish useful simultaneous graph/control visibility before selecting final sizing and breakpoint. Record the decision in the source spec; keep other layout alternatives there.
3. Implement a shared workspace playback placement contract and integrate every inventoried playback route. Reuse existing graph-owned actions and state, retaining route-specific semantics rather than imposing a fixed button set. Keep one accessible playback group, preserve focus and availability rules, and keep setup controls in the inspector. Explicitly decide graph-adjacent access to live parameter/speed controls. Fixed-point may lead the prototype; its completion alone does not complete this task.
4. Verify all source-spec acceptance criteria with focused tests and production browser checks. Record a route/action coverage matrix, including both languages, touch/keyboard, rotation, enlarged text, Presentation mode, applicable lesson/chapter activity hosts, parameter edits, terminal state, and disposal. Check representative nonanimated routes for shared-shell regressions.
5. Update affected workspace guidance, record evidence and limitations here, and review/commit/release according to AGENTS.md when implementation is authorized.

## Completion evidence

Map the source-spec criteria to test or browser results for every inventoried playback route, with before/after screenshots and its complete supported playback sequence while the graph remains visible. Include iterative and continuous animations and any polynomial/rational variants. Report actual phone coverage separately from emulation. Task preparation provides no implementation or runtime verification evidence.

**Done 2026-11-10** (controls stream step 6; commits s6a, s6a review fix, s6b). Evidence in `docs/reviews/feature-streams/controls/`: inventory and before shots ([screenshots](graph-adjacent-controls.screenshots.md)), [prototype](graph-adjacent-controls.prototype.md), implementation `w3-s6a.md` and `w3-s6b.md` (route list, inline exceptions, live-control decisions, observed test failures), browser `w3-s6-smoke-a.md` (route × check matrix) and `w3-s6-smoke-b.md` (conditions plus Baseline). Production build of `64e2c0c2`, Chromium emulation only; no real phone or WebKit.

| Criterion | Result |
| --- | --- |
| 1 Graph and actions together | 25 playback routes (22 switched in s6b, fixed point, De Casteljau polynomial and rational) at 390 × 844: board 47–59 % of the viewport with every button at scroll 0 (before: 2 of 13 measured routes). 360 × 640: board 200–235 px; one scroll to the board top shows board and whole row on all 25 (Reset below the fold at scroll 0 on 20). 320 × 640, 844 × 390 and 200 % text: actions reachable, no clipping or overflow, board at its 200 px floor. |
| 2 No scroll, semantics kept | Play then Pause on all 25: `scrollY` unchanged, board changed, labels toggled. Route-specific Step/Reset/Back kept; live sliders stay in the inspector (spec, layout decision). |
| 3 One group, 44 px, focus | Exactly one `.inspector-playback` with actions per route at every viewport; buttons ≥ 44 × 44; keyboard reaches the slot, Enter/Space operate, 3 px focus ring; English labels in the same placement. |
| 4 Resize, rotation, disposal | Resize 390 × 844 ↔ 844 × 390 while playing: still playing, focus kept, one group. Route exit while playing: no group left, playback stopped on return. Unit tests `PlaybackSlot.test.tsx`, `PlaybackRoutes.test.tsx`. |
| Hosts and shell | Guided lesson on fixed point and bisection: row dimmed and inert while locked, restored on exit. 1280 × 800 and Presentation mode: group in the inspector, slot empty. `/bezier/curve`, `/analysis/euler-method`: no empty row. Baseline rows in Slovenian passed. |

Limitations: Euler's method (step reveal without Play), the lesson-only patch sweeps and the collision playgrounds stay inline (`w3-s6b.md`). Voronoi's construction needs a site chosen in the inspector first; until then the row shows its buttons unavailable with the generic "no steps" reason. Rotation was checked as a viewport resize; `100svh` with real browser chrome unverified; no screen-reader run.
