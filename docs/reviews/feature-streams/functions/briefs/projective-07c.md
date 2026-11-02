# Brief handoff-v12: projective conics 07c (K4 five-point drag measurement)

- **Role:** measurement and benchmark extension; edit permission in `.claude/worktrees/stream-functions` (branch `stream-functions`). Do not commit, push or delegate. You are the only editor. Touch `scripts/projective-conic-benchmark/` (bench, README), the ADR `docs/adr/0033-*.md` (a new addendum section at the end), and `src/graphs/projective/fivePoint*` only if the measurement shows a change is needed (then report before changing source).
- **Goal:** task 07c in `docs/tasks/projective-conics/07-batch-b.md`: measure the cost of dragging a point of the K4 five-point graph (`FivePointGraph.tsx`, `fivePointModel.ts`, `fivePointEdit.ts`) and record the numbers in ADR 0033. F2a requires measuring "before fixing the sample density". Unlike K2/K3 (cached polyline), every K4 drag move changes the conic, so the per-move path is: `movePoint`/`nudgePoint` → `evaluateFivePoint` (BigInt `conicFromFivePoints`, classification, rational arc, `arcDeviation` at `DEVIATION_SAMPLES` = 200, extrapolated pieces) → conic sampling at the shared density 360 → the JSXGraph redraw. Find the actual per-move call chain in `FivePointGraph.tsx` first and benchmark exactly that chain.
- **Precedent:** the 05d addendum in ADR 0033 (section "Measurement addendum (2026-10-31, slice 05d)") and its bench `scripts/projective-conic-benchmark/bench.ts` (`just projective-conic-bench`). Extend the same bench with K4 cases; keep its existing cases and output format.
- **Scope of measurement:** math path in Node, as in 05d. There is no route until Batch B F2b, so browser frames are left to F2b: say so in the addendum, naming the cases F2b must measure on the route with `scripts/projective-browser-perf.cjs` (K4 point drag on the ellipse, hyperbola and parabola examples; arc-end/third-point change).

## Cases

1. Per-move cost for a drag of each of the five points along a path of ~150 grid steps (1/5 snap) on each default example (`ellipse`, `hyperbola`, `parabola`), plus moves that pass through degenerate states (`three-collinear`, `four-collinear`). Median, p95, max.
2. Split of that cost: solver + classification, arc + deviation (200 samples), conic sampling (360), extrapolated pieces. State which part dominates.
3. Polyline vertex counts per move (conic + arc + extrapolation), since JSXGraph redraws them on every board update.
4. If the per-move median exceeds about 2 ms or p95 about 4 ms, measure `DEVIATION_SAMPLES` 100/200/400 and density 180/360 to recommend a change; otherwise state that density 360 and 200 deviation samples stand.

## Checks

- `just projective-conic-bench` runs clean (full output to a log); report machine (`node -v`, CPU from the previous addendum if the same machine).
- `npx tsc --noEmit --pretty false` if you touch TypeScript under `src/`.
- The addendum states numbers as medians over at least 3 runs and names the commit measured.

## Return

≤ 250 words: the numbers table, the decision (density and deviation samples stand or change), files changed, log paths. Logs to `C:/Users/1337Hacker/.claude/jobs/bf1997d8/tmp/07c/`, never `docs/`.

Budget: grep before reading, ≤150 lines per read, output to logs. On `HANDOFF` or after about 30 turns, write state, remaining steps, touched files and checks to `docs/reviews/feature-streams/functions/worker-projective-07c-handoff.md` and return partial.
