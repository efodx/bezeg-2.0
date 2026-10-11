# Historical backlog

This list holds ideas from the original Bezeg TODO, curated on 2026-10-11 against the current code. Completed items were removed; they remain in git history. Nothing here is scheduled. Before implementation, each item needs an educational goal, a bounded spec in `docs/specs/`, and the relevant mathematical checks (see [roadmap](docs/roadmap.md), phase 5).

## Mathematical and teaching features

- [ ] **Show PH arc length on the PH graphs.** Polynomial arc length is the defining property of PH curves, and the thesis and guided lessons already explain it (`src/learning/content/guidedLessons.ts`). Neither PH graph displays the arc length.
- [ ] **Show elevated control points on the original control polygon.** Each elevated point is the convex combination `P'_i = (i/(n+1)) P_{i-1} + (1 - i/(n+1)) P_i`, so it lies on the edge `P_{i-1}P_i`. `ElevationGraph` provides only an "elevate" button and does not show this relationship.
- [ ] **Bézier curves in arbitrary dimension.** The old list marked this as top priority. `Point` (`src/bezeg/api/point/point.ts`) is still fixed to `X()`/`Y()`. The algorithms generalize directly, but the app draws 2D boards with JSXGraph, so the spec must first state what students would see (for example, a 3D curve with its projections). It also needs a separate geometry-model change before any UI work.

## Engineering cleanup

These items continue the [curve ownership refactor](docs/specs/curve-ownership-refactor.md) and the follow-up slices in the [architecture assessment](docs/curve-architecture-deep-dive.md).

- [ ] **Stop calling `board.update()` from curve setters.** There are about 24 direct `board.update()` calls, many inside setters on `AbstractJXG*Curve` objects. The owned `GraphSession` should schedule refreshes. (Merges the old "setters should update in `componentDidUpdate`" and "`curve.board.update()` shouldn't be needed" items.)
- [ ] **Initialize graphs from presets/scenes and remove `initialize()`.** `BaseGraph.initialize()` is still abstract and overridden by each graph. Presets exist, but defaults are still hand-built in code. This belongs to the planned scene/preset-codec migration.
- [ ] **Move cache state out of the geometry core.** `src/bezeg/cache/GeometryCache.ts` is a module-global revision counter inside `src/bezeg`. The guardrails require geometry independent of graph-global cache state, so freshness should be owned per curve/session.
- [ ] **Capability interfaces for curve operations and commands.** Split the Bézier API into capabilities (subdivide, extrapolate, elevate, ...) and show a graph command only when the selected curve implements it. Guided lessons already use typed graph capabilities, but graph commands do not. (Merges two old items.)
- [ ] **Remove duplicated methods across the `JXG*Curve` classes** (needs an audit first).
- [ ] **Make `JSX*`/`JXG*` naming consistent.** Note that `JSXBezierCurve` and similar names are stored preset identifiers. Renaming them breaks saved presets and imports unless a migration is added, so limit renames to code-only names or record the breaking change.
- [ ] **Clean up `JGBox`** (`src/JGBox.tsx`): remove the dead thesis-figure sizing code and the hard-coded `jgbox` element id. Board lifetime now belongs to `GraphSession`, so the rest of the old "self-initiating JGBox" idea is covered.

## Dropped or superseded

- *Own script/build setup*: tracked as the Vite evaluation in the [roadmap](docs/roadmap.md).
- *Use JavaScript `get`/`set` accessors instead of `getX()`/`setX()`*: low value with broad churn. The original note already doubted it was worth doing. Reconsider only as part of an API redesign.
- *De Casteljau without the full scheme, drawing the two interpolated lower-degree curves*: implemented as `DecasteljauGraph2` (`/bezier/decasteljau2`). Its helper curves follow the live control points, so the old "add points in De Casteljau 2" request is covered too.
