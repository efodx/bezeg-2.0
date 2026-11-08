# Brief: shared graph controls, task 1 slice 4 (handoff-v13)

**Role.** `bezeg-worker`, implementation and tests. Edit only the owned paths; do not commit, push or delegate. Preserve unrelated working-tree changes.

**Goal.** [Task 1 slice 4](../../../tasks/shared-graph-controls/01-foundation.md), formats (C28): one `formatDegrees` and one `formatScientific` in `src/analysis/format.ts`, in both languages, replacing the duplicated helpers. Read in the [spec](../../../specs/shared-graph-controls.md): row C28, the user-impact paragraph ("Delaunay and Triangulation angles lose trailing zeros; NURBS and Bisection show tiny values as `·10⁻⁷`"). `AGENTS.md` localization and context-economy rules apply.

## Settled decisions

- **F-a `formatDegrees(value, language, maxDecimals = 2)`** returns the number text only (the `°` stays in the catalog strings, as now), trailing zeros dropped as in `formatNumber`, true minus. Replace the two private `degrees()` copies in `src/graphs/compgeo/DelaunayControls.tsx` and `TriangulationControls.tsx` (they read `currentLanguage()`; use the component's language the way neighbouring code does).
- **F-b `formatScientific(value, language, digits = 3)`** always writes `mantissa·10ⁿ` with `digits` significant digits, trailing mantissa zeros trimmed, decimal comma in Slovenian, true minus for the value and a superscript minus for the exponent; `0` is `"0"`; a non-finite value is `NOT_A_NUMBER_TEXT`. Share the superscript table with `formatSignificant` (one table in the module). `formatSignificant` keeps its range switch.
- **F-c Callers.** `BSplineNurbsGraph.tsx:55` and `BisectionGraph.tsx:39` (below its 1e-9 switch) use `formatScientific`; keep their current significant digits. `BSplineBlossomGraph.tsx:256` (`toExponential(2)` on the symmetry deviation) too. `src/graphs/compgeo/simsonLineText.ts` and `hullRobustnessReadout.ts` keep their own thresholds but drop their private superscript tables in favour of `formatScientific` where the output stays identical (their tests pin it); `BezierClippingControls.tsx`'s `powerOfTenText` may stay (it writes a bare power, not a value). Report any helper you leave and why.
- **F-d De Casteljau `t = 0.50`** (`src/graphs/curves/bezier/DecasteljauAnimationControls.tsx:34`): keep two fixed decimals so the readout does not jump in width while animating, with the language's separator (`withDecimalSeparator(value.toFixed(2), language)`).

## Owned paths

`src/analysis/format.ts` and its test, the files named in F-a–F-d and their tests, and tests elsewhere that pin the old `e-7` / `30,00` texts (grep `e-\d` and `,00` near these readouts; lesson content under `src/learning/content` only if a lesson string pins the old text, in both languages).

## Acceptance and checks

1. Unit tests for both helpers in both languages: `formatDegrees(30, 'sl')` is `30`, `(30.456, 'sl')` is `30,46`, negative values use `−`; `formatScientific(1.234e-7, 'sl')` is `1,23·10⁻⁷`, `('en')` `1.23·10⁻⁷`, `-5e-9` is `−5·10⁻⁹`, `0`, `NaN`.
2. Delaunay/Triangulation readouts show `30°` for 30, NURBS and Bisection show `·10⁻ⁿ` for tiny values, De Casteljau shows `t = 0,50` in Slovenian.
3. Every new assertion observed failing under a mutation; logs `.command-logs/4-mut-*.log`.
4. `just unit` on `src/analysis` and the touched directories; `just typecheck`; `just lint` on touched files. Then once, last, in the background: `just check-changed` (log `.command-logs/4-check-changed.log`; 30–50 min under load).
5. Smoke on port 4327 (read `.agents/skills/smoke-tester/SKILL.md`, `docs/smoke-tests.md`, `docs/commands.md`): `just smoke-lesson` for the lessons that use Delaunay, Triangulation, NURBS, Bisection, De Casteljau (grep `src/learning/content` for their graph ids) and one look at each readout on its route. Stop previews you start.

## Return

≤250 words: changes per file, decisions beyond F-a–F-d, helpers left and why, mutation summary, checks with log names, gaps. Full evidence in `docs/reviews/feature-streams/controls/foundation-4.md`; on `BUDGET HANDOFF` write it there marked partial, listing exactly which checks did not run. Ask for expensive checks only once, at the end.
