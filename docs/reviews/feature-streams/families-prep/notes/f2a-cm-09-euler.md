# F2a complex-maps task 09 (EulerCircleGraph, M7) - FINAL EVIDENCE

Nothing is committed. Not registered, not smoked in a browser.

## Files
- src/complex/eulerCircleModel.ts (+test): state {degrees 0..360, omega 1..4, degree 1..30, velocity, acceleration, mode, b}, parse/serialize, typed* refusals, drag snaps, nextAngle, scene actions (set-angle/omega/degree/vectors/step/set-b/set-mode), exactTrig, deriveEulerCircle (incl. product mode).
- src/graphs/complex/EulerCircleGraph.tsx (+test, 61 tests), eulerCirclePresetCollection.ts (+test).
- Locale block `euler_circle_graph_*` in en.ts and sl.ts (lockstep). Task status line in docs/tasks/complex-maps/09-batch-d.md.

## Observed
- `just unit src/complex src/graphs/complex`: passed (final run after the added tests, log .command-logs/cm09g-unit2.log).
- `just lint src/complex src/graphs/complex`: passed.
- `npx tsc --noEmit --pretty false` (.command-logs/cm09g-tsc.log): 5 errors, all in src/graphs/trig/UnitCircleGraph.test.tsx (other worker); none in my files. Not rerun after the two small test additions.
- `git diff --check`: only CRLF warnings of other workers' files. No trailing spaces, no control characters, no blank last line in owned files and both locales.

## Mutations (each restored, cmp equal; backups .command-logs/cm09g-<name>.bak, logs cm09g-m-<name>.log)
Killed by: snap (round->floor) "a dragged point snaps..."; snap2 (B_STEP) "the second angle is a multiple of 5..."; next "the playback step goes to the next multiple of 5..."; exact (quadrant 1 sign) "defined exactly at the multiples of 30 and 45"; vel/acc/time "theta = pi/6, omega = 2: ..."; sum (mod 180) "e^(i pi) = -1 exactly..." and "the product rule holds..."; key "the key is a file contract..."; unk "the graph state holds only the initialized flag"; ring/veldash/accdash "each legend entry states a style..."; parse:true "a caption names every element...", legend, language tests.
Survived at first, then strengthened and killed: view limit 2.4->3 (new "the view limit is 2,4 on each axis, inclusive"), STEP_INTERVAL_MS 100->200 (new literal 100 test), removed reduced-motion guard in play() (direct `graph.play()` assertions in the reduced-motion test).
Survived, judged equivalent: `>= ANGLE_RANGE.max` -> `>` in play(): at 360 the controller does one capped step and stops, no observable difference; a direct `graph.play()` assertion at 360 was added anyway.

## Decisions and doubts for review
- Time is the angle: whole degrees 0..360; t = theta/omega derived. Playback and Next step advance to the next multiple of 5, 100 ms per step.
- Second angle is named φ everywhere in the UI (field `b`). θ is on whole degrees, φ on the 5 degree grid; both grids are in the fields' help. NumberInput's own range hint shows for out-of-range input (accepted), so `euler_circle_graph_angle_rejected` shows only for refusals inside the range.
- JSXGraph captions use `parse: false`; without it "e^(" was drawn as a superscript bracket (fix kept, mutation-tested).
- Velocity drawn at scale 0,4, acceleration at 0,1 (short at omega 1). Unverified visually.
- Exact point labelled exact for multiples of 30 and 45 degrees; sum, error, time, velocity, acceleration labelled computed. Partial sum beyond |re| or |im| 2,4 not drawn; legend and readout rows say so.
- Typing a multiple of pi in the angle field is not built (whole degrees only); open against the spec text.
- Unit circle uses a `ring` helper because an inline `board.create("curve")` fell to the generic overload (TS2345); cause not found, helper compiles.
- Unchecked: everything in a browser (legend of up to 10 rows under the board, VIEW_BOX [-2.2, 2.2, 2.2, -4.4], arrow heads); Slovenian wording ("Perioda"/"Obhodni čas", "Vektor hitrosti") follows the power block.
