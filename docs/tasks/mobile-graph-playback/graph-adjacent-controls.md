# Keep demonstration playback beside the graph

**Status:** backlog; planning only, no application code changes authorized now.
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
