# Lane L52 (bspline-basis) notes

Files: BSplineBasisGraph.tsx (ids, parameterBindings, declaration, viewMarks, performAction, PuckOwned wraps, hidden notes panel),
BSplineBasisGraph.declaration.test.tsx (new), fragments/bspline-basis.ts (new) + index.ts line, parity sample + `__parity__/bspline-basis.json` (new, recorded
before the change), bsplineBasisGuidedLessons.ts (frames), BSplineBasisGraph.test.tsx (runAs learner), BsplineFirstTask.test.tsx (basis case).

Placement judgements
- `basis-t` range puck on the board: steps 2, 3 and 6 ask to move t while the values and the sum are read.
- `basis-degree` count puck: step 1 ("pick degree 2 and 3 and watch the spans"), step 6 explore.
- `clamped` switch puck (action, pressed): step 6 observation ("switch to unclamped uniform vector").
- Orodja: the display toggle `Prikaži območje na [0, 1]` (setting chosen once; no step asks for it) and the typed knot list (vector of
  typed values, no arbiter key; knots are also dragged on the board). Steps 4 and 6 open Orodja for them.
- No legend: the n + 1 curves are told apart by colour only and there is no named object to explain; the board knot labels and dots are not legend material.
- Marks: one `must` box over the knot axis, its stacked markers and labels, up to height 1. The view is the graph's own fit (`basisViewBox`).

Board captions: the scene still draws the readout and the domain text on the board (tests and figure export read `readoutText`/`domainText`).
They duplicate the declared notes; contract decision "board captions stay board-drawn", so kept. Reported for the handler.

Gaps
- The four lines are notes, so Odčitki shows the heading with "Opombe (3)" folded; values and sum are visible in the board caption.
- The values sentence needs one template per count (2 to 4 active functions) because a message cannot repeat a sub-message.
- Parity: `captions not covered: 20` (the knot labels "0 (×3)" etc.).

## HANDOFF (partial, budget signal)

Done and observed
- Parity recorded before the change; tsc clean (before the last scene edit); lint passed on the first file set; declaration test (10 pass) red once: sum +0.01 gave `expected 'vsota = 1,01' to be 'vsota = 1'`, restored.
- `just graph-check bspline-basis --route bspline/basis` PASSED (contract, parity, golden, declaration, shared 104) BEFORE the caption removal.
- Unit bspline dir + BsplineFirstTask + declarationContract + lessons passed (l52-unit6.log); `just unit FirstTask`, preset roundtrip -t bspline-basis, golden check passed.
- Wide run (base, curves, learning/content, localization, workspace; l52-unit7.log) failed only on simson-line (L51's files): 15 tests, none mine.
- Browser 1440x900 and 1280x720, all 6 lesson steps: no element centre under a card; BUT the board readout caption (top-left) and domain caption were under the Lekcija card at 1280x720 (.command-logs/l52-1280-08*, -12*).

Last edit, NOT yet re-verified
- Removed the two board captions (readout lines, domain) from BSplineBasisScene.ts per the owner caption decision (they repeat the declared notes); added `open: ['readouts']` to the value-reading frames in bsplineBasisGuidedLessons.ts.
- graph-check golden now FAILS as expected (caption-only difference: the golden `captions` per state lose the 3 readout lines and the domain text; notes unchanged). Per decision "re-record after browser check": handler re-records. Not re-recorded by me. Diff detail not extracted (log .command-logs/graph-check/bspline-basis-golden.json).

Next
1. Rerun tsc, `just lint` on BSplineBasisScene.ts, `just unit src/graphs/curves/bspline src/graphs/curves/BsplineFirstTask.test.tsx src/learning/content/declarationContract src/learning/content/bsplineBasisGuidedLessons` (BSplineBasisGraph.test may assert the board text elements; unchecked).
2. Retake shots (`node .command-logs/l52-shots.cjs`, log l52-shots.log) to confirm Odčitki opens and nothing read is covered.
3. `just build`, `just smoke-lesson bspline-basis`, `tests/guided-lessons.smoke.spec.cjs` (names bspline-basis) not run.
4. Scratch to delete: .command-logs/l52-*.

## Session 2

- Board readout/domain captions are gone (BSplineBasisScene.ts); tests assert the declared notes/rows (BSplineBasisGraph.test.tsx language test).
- Legend: one entry per basis function N_{i,k} (ids fn0..fn11, cap 12), kind line/dashed by `basisCurveDash(i)`; the scene now dashes the curves the same way, so colour is not the only cue (BSplineBasisGraph.tsx legendEntries/drawnObject, Scene line 109). New key `bsbd_legend_fn`.
- Readouts: values and sum were folded behind "Opombe"; now rows: one per active function (name N_{i,k}, value) plus `sum`; notes keep the heading and the domain. A single sentence row was clipped in the card, so the per-count template keys (bsbd_values_2..4) were dropped (no sentence). Lesson highlights now name fn rows (mirror fn1-3, locality fn2-4, bernstein fn0-2).
- Parity: `bsplineBasisAccepted` in parity.test.tsx (missing note, extra rows). Golden differs by captions only (5 states, the readout lines and domain text left the board): handler re-records.
- Checks: tsc clean for this lane (InversionGraph errors are another worker's); eslint clean; unit bspline + FirstTask + contract + lessons + mathNotation + localization passed (l52-unit12.log); graph-check all pass except golden; build, smoke-lesson, guided-lessons --grep bspline-basis passed.
