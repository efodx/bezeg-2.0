# Brief: controls task 2, slice P4b, finish the PointSet pilot (handoff-v13)

**Role:** implementation worker, may edit the owned paths below. Do not commit, push, or delegate.

**Goal:** finish slice P4 from the previous worker's state. Read [points-p4-brief.md](points-p4-brief.md) (the original brief; its acceptance still holds) and [worker-p4-handoff.md](worker-p4-handoff.md) first. The P4 changes are uncommitted in the working tree; keep them.

**Handler's run of the P4 state** (`.command-logs/2026-11-08T09-17-55-095Z-41492-e779f722.log`, `just unit src/graphs/compgeo src/compgeo`): 3 failed of 1756.

- `FortuneGraph.host.test.tsx` "C-5: Add at twelve sites is refused with a visible notice in both languages and adds nothing"
- `VoronoiGraph.host.test.tsx` "a live language switch re-renders the panel and the query text"
- `DegenerateSitesGraph.host.test.tsx` "arrow keys move the selected site one grid step; the numeric fields set a coordinate"

`just lint src/graphs/compgeo src/compgeo eslint.config.mjs`: one error, `'t' is defined but never used` at line 12 of a file in those paths.

**Acceptance**

1. Each of the three failures is fixed by correcting the code where the test's intent is still right (a count-limit refusal must still give a visible reason in both languages, decision 13; a language switch re-renders; arrows move one grid step), or by updating the assertion only where it encodes a removed behaviour (the coordinate `range` notice, the old DOM). State which, per test.
2. **Pressed reason language (from P4's gaps):** `PointCollection` (`src/inputs/PointCollection.tsx`) stores the pressed reason as translated text, so it stays in the old language after a switch. Store what produces it (a key with values, or a function called during render) so a switch re-renders it in the new language; add a test in `src/inputs/PointListInput.props.test.tsx` or a new `PointCollection.test.tsx` that fails before the fix.
3. **One fit path (C19):** `PointSetGraph.refitFor` copies the host Fit's point gathering from `BaseGraph.navigateBoard` (private, `src/graphs/base/BaseGraph.tsx` ~line 752). Extract it into one protected `BaseGraph` method, e.g. `fitToVisiblePoints(extra: readonly [number, number][] = [])`, used by `navigateBoard('fit')` and by `refitFor` (which then is `refitWhenOutside(box, [point], () => this.fitToVisiblePoints([point]))`). The host Fit's behaviour must not change: `src/graphs/base` tests stay green.
4. `just unit src/graphs/compgeo src/compgeo src/inputs src/graphs/base` green; `just lint` clean on your paths (`scripts/demonstration-clip-rows/compgeo-traces.cjs` belongs to another stream: ignore its errors); `just typecheck`; `just build` (localization changed in P4).
5. Write the evidence note `docs/reviews/feature-streams/controls/points-p4.md` (≤60 lines) covering P4 and P4b: acceptance items with `file:line`, each changed test assertion and why, observed mutation failures (the handoff lists P4's), known gaps (segments and intervals keep their own add buttons and count lines, to be handled in the compgeo sweep; anything else).

**Scope:** owned: P4's paths (see its brief) plus `src/inputs/PointCollection.*`, `src/inputs/PointListInput.props.test.tsx`, and `src/graphs/base/BaseGraph.tsx` (the fit method only). Another worker is editing `src/graphs/curves/**`, `src/learning/**`, `src/graphs/functions/CorrelationGraph.tsx` and `src/graphs/base/sharedControls.graphs.test.tsx` at the same time: do not touch them.

**Context:** Windows, Git Bash. `core.autocrlf` is true: keep each file's line endings. With Python, open with `encoding='utf-8', newline=''`; never open a file for writing before the content is ready. Run the full `just unit` path set in the foreground with output to `.command-logs/p4b-*.log` (it takes about 11 minutes; use a timeout of 600000 ms or split by directory) and read its result before you return; do not leave runs in the background. Never bare `npx vitest`/`npm test`. Read by range; locate with search.

**Return (≤250 words):** per failure, cause and fix; the fit seam; the language fix with its failing-first test; command results; anything unverified. If you get `BUDGET HANDOFF`, stop and append to `worker-p4-handoff.md`.
