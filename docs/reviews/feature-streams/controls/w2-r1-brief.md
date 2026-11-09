# Wave 2 repair R1: review findings on C2 and P

Read `w2-common-brief.md` (rules, checks, return). Findings come from the engineering review of slices C2 and P.

**Owned:** `src/graphs/compgeo/PolygonAreaGraph.tsx` and its host test; `src/inputs/PointListInput.tsx` and its tests (`PointListInput.test.tsx`, `PointListInput.props.test.tsx`); `src/graphs/projective/FivePointControls.tsx`, `PolePolarControls.tsx` and their host tests; `src/graphs/compgeo/PointSetSegments.host.test.tsx`, `PointSetIntervals.host.test.tsx`, `TriangulationGraph.host.test.tsx`, `PointInPolygonGraph.host.test.tsx`. Workers C3b and C3c edit other compgeo files.

1. **Stale Reverse refusal (medium).** In `PolygonAreaGraph.tsx`'s Reverse control the `pressed` counter is never reset, so once Reverse was pressed while unavailable, the refusal reappears by itself whenever the polygon drops below two points again. Expected: the refusal shows only after a press while unavailable and clears when the reason clears, so a later re-block without a press shows nothing (match `blocked` in `PointSetControls.tsx`). Add a test: press while blocked, unblock, re-block, no refusal; observe it fail before the fix.
2. **Spinner step (low).** `PointListInput.tsx:122` passes a fixed `step={1}`, so FivePoint and PolePolar fields now step 1 with arrows instead of their grid. Add an optional `step` prop (default 1, existing callers unchanged); FivePoint passes 1/15 and PolePolar 0.2. A `PointListInput` test with an observed failure, and one real-graph case.
3. **Weak assertions (low).** In `PointSetSegments`/`PointSetIntervals.host.test.tsx` replace `getAllByText(...)[0]` with queries on `[data-pointset-pending]` / `[data-pointset-notice]` (the visible line). In `TriangulationGraph.host.test.tsx` pair each `not.toContain` on the live region with a positive check of what it holds.
4. **Limit silence.** Observe the PointInPolygon limit-silence test fail by mutation (re-add a notice at the limit), then restore.

Run `just unit` on all owned tests plus `src/inputs` and `src/graphs/base/sharedControls.graphs.test.tsx`, `just lint` on owned files, and `just typecheck`. Append evidence to `w2-c2.md`; return ≤250 words.
