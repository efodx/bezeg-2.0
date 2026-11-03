# 23b handoff (partial, at the budget threshold)

Worktree `.claude/worktrees/agent-ad42460681997836f`, branch `worktree-agent-ad42460681997836f`, from 67098cc1.

## Done (evidence in 23b-*.log)

1. Polyline only: `BeachDrawing`, the `arcs` path and the `beachDrawing` option are gone (`fortuneDrawing.ts`, `FortuneGraph.tsx`); `23-perf.md` has the "Chosen: polyline" line.
2. Ownership: `FortuneGraph` keeps `ownedBy` (the session whose board the handles draw on); name-based inference (`hasObjectNamed`) is deleted. `disposeFigureScene`/`unmount` dispose, a foreign session's handles are forgotten (`forgetOwned`). Host test "ownership" covers a preset scene replacement, an example, Reset, 20 step changes and a drag (object count stable) and an explicit disposal and re-creation.
3. Readouts: queue list (`queueItems`/`QueueList` in `FortuneControls.tsx`): live entries in order with the next one marked, cancelled circle events struck through (`<s>`) AND named "preklican, lažni alarm" / "cancelled, false alarm" in text and aria-label; beach, vertices found/expected, event note, live region (existing, now tested in sl and en). New keys `fortune_queue_*`, `fortune_view_reset` in sl.ts/en.ts. Refusals unchanged (duplicate refusal names both sites; covered by 23a).
4. Follow view: shared helper `followBox.ts` (`visibleGridBox`, `followedGridBox`) now used by `VoronoiGraph.tsx` and `FortuneGraph.tsx` (Voronoi behaviour unchanged, its host tests pass). New `Reset view` button (`resetView()`), new `drawingStats()`.
5. Host tests (13 in `FortuneGraph.host.test.tsx`) and the math-review tests in `fortuneGeometry.test.ts` (trace origins equidistant, heightText collapse/surd, box contains lows and vertices; comment on the radius > 3 span skip added in `fortuneGeometry.ts`). Mutations: `23b-mutations.log`.
6. Docs: capabilities entry, GLOSSARY (3 terms), localization.md term row.
7. Checks (all passed on the final tree): unit (`23b-unit.log`, Fortune + sweep + Voronoi), lint, tsc, build.

## Remaining / unverified

- Mutation "Reset view keeps the follow box" SURVIVED: the Reset view test does not pin the follow-box reset (FortuneGraph.tsx `resetView`, `this.followBox = undefined`). Strengthen: zoom, Reset view, then assert the sweep line `dataX` equals the run box.
- "Cancelled circles not drawn" mutation failed by a crash (undefined element), not by a count assertion; acceptable but weak.
- Mutations for polyline-origin of "step kept after drag" and Reset example were not re-run this slice.
- No browser smoke check (route registration is task 24); no check at 1280x720 / 390x844; queue list CSS is the shared `SweepSideLists.css`, untested visually.
- Sl wording of the queue keys is mine (terms follow existing ones); no external review.
- Keyboard step control = the Next step button operated by Enter/Space (`userEvent.keyboard`); no global shortcut exists or was added.
