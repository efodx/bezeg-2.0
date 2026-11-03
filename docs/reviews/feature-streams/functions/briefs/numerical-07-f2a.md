# Brief handoff-v12: numerical methods 07 F2a (direction-field and Euler graph for N5)

- **Role:** implementation and tests; edit permission in the stream worktree `.claude/worktrees/stream-functions` (branch `stream-functions`). Do not commit, push or delegate. Other streams work in other worktrees; in `sl.ts`/`en.ts` make targeted Edit insertions only (never rewrite the files).
- **Goal:** the Euler graph, F2a only: no route, no catalog entry, no Demonstration registration, no lesson. Sources: N5 in `docs/specs/numerical-methods-lessons.md` (graph needs; acceptance 1, 2, 3, 5, 6, 7), `docs/tasks/numerical-methods/07-batch-c.md` step 2, and **ADR 0037** (`docs/adr/0037-direction-field-drawing.md`): the field is **one JSXGraph `curve`** with NaN-separated slope marks regenerated in `updateDataArray` from the bounding box, fixed screen-space mark length, regenerated only on view or example change; the Euler polyline and the exact curve are separate curves; plain slope marks, no arrowheads.
- **Pattern to copy:** the Batch B F2a slice `src/graphs/functions/QuadratureGraph.tsx` with its tests (`QuadratureGraph.test.ts`, `.host.test.tsx`), messages module and Preset parser/collection (find with `grep -rl Quadrature src`); `src/graphs/functions/IterativeFunctionGraph.tsx` for the step reveal (Next step playback). Kernel to use, not change: `src/analysis/odeEuler.ts` (`EULER_EXAMPLES`, `STEP_SIZES`, `isEulerStep`, `eulerPath` with `EulerTermination`, `directionField`, `EULER_FIELD_MAX` = 40 per direction, window bounds `EULER_X_MIN/MAX`, `EULER_Y_BOUND`, `EULER_MAX_STEPS`).

## What to build

- `EulerGraph.tsx` (+ messages module) under `src/graphs/functions/`: example select (`exponential` \(y'=y\), `linear-relaxation` \(y'=x-y\), optional `blow-up` \(y'=y^2\)), draggable initial point plus numeric inputs for \(x_0, y_0\) (constrained so no non-finite values appear), discrete step control over `STEP_SIZES`, end \(x\), end-value readout, exact value and absolute error where the example has an exact solution, ratio to the error at \(2h\), optional dashed exact curve toggle, optional step reveal (Next step / show all). The field grid follows the view, at most 40 columns (choose rows from the aspect, at most 40); a test asserts exactly one field curve object is created and that unmount removes every created object.
- Divergent run (`non-finite` or `left-window` termination, e.g. `blow-up` toward \(x=1\)): stop the polyline at the last finite point and show a visible status text (acceptance 3); never draw off-screen segments.
- Default: `exponential`, \((0,1)\), \(h=0.5\), end \(x=1\). Tests reproduce N5's numbers to the shown digits: \(y'=y\): 2.25, 2.4414, 2.5658, errors 0.468, 0.277, 0.152, ratios 1.69, 1.82; \(y'=x-y\): 0.5, 0.6328, 0.6872, errors 0.2358, 0.1029, 0.0485 against \(2/e\). Field slope at a sample point equals \(F(x,y)\); the first Euler step equals \(y_0+hF(x_0,y_0)\) (rational check at \(h=0.5\), acceptance 2).
- Preset type with a parser validating example id, \(x_0, y_0\) bounds, step via `isEulerStep`, end \(x\), toggles, with actionable errors; registration in the Preset import list follows what the quadrature F2a did (check `git log --stat` of its parser), else leave it for F2b and say so.
- Locale: one `euler_*` block after the quadrature keys in both `sl.ts` and `en.ts`, lockstep. Terms from `docs/tasks/numerical-methods/README.md` (polje smeri, Eulerjeva metoda, približek); new terms per `docs/localization.md#choosing-new-terms`, listed in the report. Slovenian decimal commas as the existing graphs do. Lesson actions only if the quadrature F2a defined them at F2a (follow its pattern).

## Checks

- `npx tsc --noEmit --pretty false`, `npx eslint` on touched files.
- `just unit src/graphs/functions src/analysis src/localization` (adjust paths). Never the full suite; never `just check`/`just build`.
- Host test: mount, step change by control and keyboard, initial-point drag or numeric change updates the polyline and readouts, example switch, exact-curve toggle, step reveal, blow-up status, language switch updates board text and readouts, Preset import and Reset restore controls and board, unmount leaves no board objects, view change regenerates the field (stub `getBoundingBox` as `RationalFunctionGraph.host.test.tsx` does).
- Mutation evidence for at least four new assertions (wrong error ratio denominator, field slope transposed, extra field objects per mark, divergent run drawn past the last finite point, invalid Preset accepted): mutate, observe the failure, revert.

## Return

≤ 400 words: files changed, checks with log paths, mutation evidence, computed example numbers, new terms, deviations as `file:line`, open questions. Logs go to `C:/Users/1337Hacker/.claude/jobs/4cd4c05f/tmp/n07/`, never `docs/`.

Budget: locate with `grep -l`/`-c` before reading; read ≤ 150 lines per call; send test and lint output to log files. On a `HANDOFF` message, or after about 30 turns before acceptance, stop at a consistent point, write state, remaining steps, touched files and checks to `docs/reviews/feature-streams/functions/worker-numerical-07-f2a-handoff.md`, and return as partial.
