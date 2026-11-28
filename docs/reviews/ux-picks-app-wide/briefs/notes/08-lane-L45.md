# L45 (ph-quintic, rational, affine), worker 2026-11-28

## ph-quintic
- Parity recorded first: SAMPLES `ph-quintic` (parity.test.tsx), `src/graphs/curves/ph/__parity__/ph-quintic.json`.
- `QuinticPhBezierCurveGraph.tsx` opts in `declaresPhWorkspace()` (L56 base unchanged). Placement as ph-cubic: d puck while offsets drawn (lesson steps ph-quintic-offset-positive / -offset-sign), arc length row; no geometry switch on the quintic.
- Lesson (expansionGuidedLessons.ts): "odcitek na grafu" -> "v kartici Odcitki" (worked example check, step 2 expected observation), sl+en.
- Test `QuinticPhBezierCurveGraph.declaration.test.tsx` (6). Red seen: `pressed` of arc-length-shown negated in base, "expected false to be true" (`.command-logs/l45-q-red.log`).
- graph-check (log `.command-logs/l45-q-gc.log`): contract/parity/declaration/shared pass; golden FAIL as for cubic: captions "Dolzina loka: 9,233 / 3,400 / 3,400" -> [] in default, ph-quintic-degree, ph-quintic-offset-positive. Golden read: `src/graphs/bernstein/__parity__/ph-quintic.golden.json`. Not re-recorded.

## rational
- Parity recorded first: SAMPLES `rational` (5 states, weights set via `getCurve().setWeights`), `src/graphs/curves/rational/__parity__/rational.json`; the shown values are the board labels w_i (captions).
- `BaseRationalCurveGraph.tsx`: opt-in hook `declaresRationalWorkspace()` (default false) drives `declaresCurveWorkspace()`; other subclasses unchanged (declaration test checks RationalElevationGraph stays undeclared).
- `RationalBezierCurveGraph.tsx` opts in. Placement: weights stay beside their control points as the board labels w_i (no step asks the learner to vary one weight: the scene sets them), weights switch / point labels / control points switch in Orodja `display`, polygon + hull pucks (common declaration).
- Test `RationalBezierCurveGraph.declaration.test.tsx` (8). Red: weights-0 `pressed` negated in BaseCurveGraph:422 -> "expected { id: 'weights-0' ... } to match".
- graph-check: all pass incl. golden (`src/graphs/curves/rational/__parity__/rational.golden.json`, identical).

## affine
- Parity recorded first (old graph file restored from HEAD for the recording, then mine put back): SAMPLES `affine`, `src/graphs/curves/bezier/__parity__/affine.json` (6 states). Rows `T(B(t))`, `B_T(t)` (values equal by affine invariance).
- `AffineTransformsBezierCurveGraph.tsx`: `declaresCurveWorkspace()` true; own `declaration()` = common + readouts group `affine-compare` (title `affine_compare_title`) with the two rows while a comparison exists + note (the help sentence); `curveViewMarks()` adds 25 samples of the dashed original curve. The tools-column comparison section and `comparisonReadout()` removed.
- Placement: the 10 transformation buttons (rotate 2, move 4, scale 2, reflect 2) stay in Orodja as today: more than 4 choices (puck limit) and the last lesson step lets the learner pick any; the steps 2-4 apply them as scene actions.
- New fragment `src/localization/fragments/affine.ts` (`affine_mapped_name`: "T(B({value0}))", sl = en) + 4 registrations in `fragments/index.ts`. Second row is the typeset symbol `B_T(t)`.
- Parity accepted differences (affineAccepted): second row renamed (recording "BT(t)" text), help note extra.
- Test `AffineTransformsBezierCurveGraph.declaration.test.tsx` (7); red: moved-points x + 1 -> "expected '(-1,63; -1)' to be '(-0,63; -1)'". `BezierCurveGraph.declaration.test.tsx` "not opted in" case now uses RationalElevationGraph (Affine is declared).
- graph-check affine: contract/parity/declaration/shared pass; golden FAIL (deliberate): 8 rows missing in affine-translation, affine-quarter-turn, affine-scale, affine-analysis (T(B(0,5)) "(1; 0,75)", "(2,25; 1)", "(3; 2,5)", T(B(0,75)) "(1,31; 2,19)"; same for BT): the golden recorder no longer sees the old tools readout; the declared Odcitki rows carry the same values (parity). Golden read: `src/graphs/curves/bezier/__parity__/affine.golden.json`. Not re-recorded.

## Shared file edits
- `fragments/index.ts`: HEAD 900b21351 imported `subdivision` from "./patchTensor" (undefined at load, every unit test failed with "reading 'sl'"); fixed to `./subdivision` (1 line) + my 4 affine registrations.
- `parity.test.tsx`: SAMPLES for ph-quintic, rational, affine + `affineAccepted`.

## HANDOFF (partial, budget)
Done and observed: all three graphs converted; declaration tests green with red seen; graph-check ph-quintic (golden fails: 3 caption diffs), rational (all pass), affine (golden fails: 8 rows); tsc clean; eslint passed on changed files; `just unit src/graphs/curves src/graphs/base src/learning/content src/learning/chapter src/localization` had 3 failures, 2 mine fixed (AffineComparison.test readouts, PhHodographFirst quintic puck) and rerun green; the 3rd, guidedExamplePreviews.test weighted-parameterization sceneFingerprint, is not from this lane (L21 content; not investigated); FirstTask pass; round trip -t ph-quintic/rational/affine pass; build pass; smoke-lesson ph-quintic, rational, affine pass.
Unverified: browser shots (shot with base http://127.0.0.1:4483 renders "Strani ni mogoce odpreti" for the routes; the route form for `just shot` was not found, `.command-logs/l45-shots*` hold only that error page); `just smoke tests/curve-editing-modes.smoke.spec.cjs` refused ("Build inputs changed"), rendered-appearance, standalone-learning, library specs not run; the unit rerun after the last test edits ran only AffineComparison + PhHodographFirst.
Next: shots of the 3 routes + affine lesson steps at 1440x900 and 1280x720; the 3 specs naming these routes; guidedExamplePreviews fingerprint owner.

## Session 2
- guidedExamplePreviews fingerprint (weighted-parameterization only; uniform fine): the hash covers the first frame incl. its resolved body, which embeds the wp-phi formula notation reworded by L21 ("na drsniku" -> "na krmilniku ... na grafu"). Scene actions unchanged. Baseline = docs/reviews/illustrated-chapter-examples/capture-inventory.json (+ src/images/learning/examples/manifest.json inventory hash, capture sceneFingerprint); refresh = capture script recapture. NOT refreshed (needs served build capture; manifest hashes would break too). Test still fails.
- Shots (dev 4483, ?learn=1, 12 steps each, 1440x900 and 1280x720): .command-logs/l45s2-{phq,rat,aff}-{1440,1280}-NN.png. Viewed a subset.
- Smoke after just build: curve-editing-modes, rendered-appearance, standalone-learning, curve-ownership, count-setter all passed. Full guided-lessons spec not run this session.
- Unit rerun blocked: another run (pid 30756, L58) hung >12 min.

## Session 3
- Affine lesson zoom: cause = no `followView`, so the director framed the lesson scene's box (-5,7,9,-5) widened to the canvas aspect in the card-free strip (about +-30). Fix: `watchedBox(marks)` + `followView` in `AffineTransformsBezierCurveGraph.declaration()` (same pattern as CurvatureBezierCurveGraph/BasePh). Shots l45s3-{a,b}-bezier-affine-*: before tiny, after curve fills the strip, labels clear (1440 and 1280).
- Rational: L45 did not touch label placement (diff is declaration opt-in only); same cause (tiny zoom). Added the same followView in `RationalBezierCurveGraph.declaration()`; shots l45s3-{b,c}-rational-base-*: w1/w2 clear of B(1/2) at 1440; at 1280 close but not overlapping.
- Fingerprint: the generator (`node scripts/generate-guided-example-inventory.cjs`) changes only the weighted-parameterization entry (1 line). Partial capture `--id` refused: "buildOutput fingerprint changed; run without --id" (any new build changes it); a full run rewrites all 56 images + manifest. Inventory change reverted; not refreshed.
- Checks: tsc 0, eslint 0, unit curves+learning+localization: 1 failed (guidedExamplePreviews, the stale fingerprint) / 5619 passed; unit base passed; golden affine: same 8 rows missing as before (not re-recorded).
