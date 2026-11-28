# Lane L58 notes (patch-subdivision, patch-joins, patch-triangular)

## Session 1 (started 2026-11-28 08:59) - PARTIAL (budget HANDOFF at ~175k, 09:18)

### patch-subdivision: converted, checks green except the browser/build part (about 19 min)

- Parity first: SAMPLES `patch-subdivision` in `parity.test.tsx` (after `patch-derivatives`; 6 states, setters under `runAs('learner')`),
  recorded to new `src/graphs/patches/__parity__/patch-subdivision.json` (`.command-logs/l58-parity-sub.log`). The first try failed
  because elevation alone changes no shown value (surface unchanged); that state also moves (u, v).
- New fragment `src/localization/fragments/patchAdvanced.ts` (split puck label, piece/split/ghost legend labels; joins and
  triangular keys go here too), registered in `fragments/index.ts` (import + 3 spreads).
- `TensorSubdivisionGraph.tsx`: `declaresTensorWorkspace` true; `SPLIT_VALUE_KEY = "patch-split-value"` bound (refuses outside
  0.05-0.95 with `DomainError(invalid_patch_subdivision_value)`); `SubdivisionIds`; declaration = tensor workspace + split range puck
  (label `patch_split_puck`, symbol `u_0`/`v_0` by direction), readout rows piece/local/piece-point/point (old keys; `point` symbol
  `S(u, v)`, legend `point`), note `correspondence`, legend piece-left/piece-right/split/ghost, tools actions elevate-u/elevate-v
  (tab edit, section elevate, enabled = canElevate) and show-pieces (display). `drawnObject`: net/points hidden while the pieces
  show; pieces need the net switch; ghost while current and net on. Old readout wrapped in `data-declared-panel`; `puckKeys` passed.
- `TensorSubdivisionPanels.tsx`: `tupleText` exported; `SubdivisionSplitControls` optional `puckKey` wraps the position slider in `PuckOwned`.
- Lesson `patchGuidedExamplesAdvanced.ts`: `frame()` takes optional `declare`; highlights: elevation-observe `point`,
  subdivision-calculate `piece`,`local`, subdivision-observe `piece-point`,`point`.
- Placement: u, v pucks (the correspondence readout says where S(u, v) lies on the pieces, read while moving them); split position
  puck (chapter prompt patchChapterEvaluation.ts:39 "razdeli krpo pri u0 = 1/2" and route prompt `prompt_patch_subdivision_pieces`
  "Premakni mesto delitve"); split direction (setup, no arbiter key), elevation buttons, pieces switch, camera, points: Orodja.
  Legend default place not changed (no view director on a surface view).
- New `TensorSubdivisionGraph.declaration.test.tsx` (8 tests). Red once: split visibility made to need the net switch ->
  "net off, pieces shown: ... AssertionError: split: expected false to be true".
- Tests moved: `TensorSubdivisionGraph.test.tsx`, `TensorSubdivisionPanels.test.tsx` (writes via a `learner()` act helper; the split
  slider tests read the puck `aria-valuenow/min/max` after `waitForPucks`, writes through the arbiter); `TensorPatchGraph.declaration.test.tsx`
  "stays undeclared" case now lists only `patch-joins` (remove it when joins is converted).
- Checks: graph-check patch-subdivision --route /patches/subdivision PASS (contract 1, parity 2, golden 1, declaration 8, shared 137;
  `.command-logs/l58-gc-sub.log`); golden check (read `src/graphs/patches/__parity__/patch-subdivision.golden.json`) pass, all 3 states
  unchanged (`l58-golden-sub.log`); `just unit src/graphs/patches ExportPausesPlayback patchGuidedExamplesAdvanced patchSceneContent
  declarationContract FirstTask lessonMathNotation src/localization` 1391 passed (`l58-unit-sub4.log`); tsc 0 (`l58-tsc2.log`); eslint
  0 on changed files (`l58-lint1.log`). No `*.report.txt` left.

### Unverified for patch-subdivision
- `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t patch-subdivision`; `src/graphs/base` +
  all `src/learning/content` broad run; `just build`; `just smoke-lesson patch-advanced-subdivision-elevation`; `tests/*.spec.cjs`
  naming the id/route; shots at 1440x900 / 1280x720 (use a playwright script with 8 s settle, `.command-logs/l55-s3-console.cjs`).
- PatchFirstTask subdivision case passed unchanged (the split controls still lead Edit: the direction select stays).

### Next
1. The unverified checks above.
2. patch-joins (not started): parity first (rows: state, position gap, derivative gap, normal angle, alpha*; note; capstone state has
   none). Placement idea: mode as a 4-option choice puck (prompt patchChapterJoinsTriangular.ts:13 "izberi način C1 in nato G1"),
   alpha range puck (same prompt "G1 z alpha=2", `prompt_patch_joins_g1` "spreminjaj razmerje alpha"; locked unless g1), joinV in
   Orodja; capstone: no pucks. Needs arbiter keys via `parameterBindings`; then drop the joins case in `TensorPatchGraph.declaration.test.tsx`.
3. patch-triangular (not started; golden default row `w=0,33`).

## Session 2 (started 2026-11-28 09:15)

### patch-subdivision: remaining checks
- Preset round trip `-t patch-subdivision`: 1 passed (`.command-logs/l58-s2-roundtrip.log`, run log `2026-11-28T08-18-12-741Z-14464-14a8b7ec.log`).
- `just unit src/graphs/base src/learning/content`: 210 files, 5346 passed, 367 skipped, 0 failed (`2026-11-28T08-18-28-381Z-30756-39f06d01.log`).
- `just build`: pass (`l58-s2-build.log`). `just smoke-lesson patch-subdivision`: 2 passed (sl walk, en 390x844).
- `just smoke-built demonstrations + guided-lessons --grep "patch-subdivision|subdivision"`: 15 passed, 1 skipped (`2026-11-28T08-37-59-702Z-25612-e58ad9a6.log`).
- Shots on dev 4483 (`.command-logs/l58-s2-walk.cjs`, 8 s settle, every frame incl. completion) at 1440x900 and 1280x720
  (`.command-logs/l58-shots/sub-*.png`): patch, both piece nets, blue split curve and S(u, v) visible beside the cards; 3 pucks
  (u, v, split u0) bottom-left; readout highlights per frame as declared; nothing under cards.
- **patch-subdivision ready.**
- Note: while the handler committed lane L41 (09:3x) `parity.test.tsx` and `fragments/index.ts` briefly lost this lane's hunks;
  they came back after the commit (checked: subdivision SAMPLES entry at parity.test.tsx:896, patchAdvanced registered).

### patch-joins: converted in source, own tests NOT green (HANDOFF at 175k, 10:16)
Files (joins only; separable from subdivision for a commit):
- `parity.test.tsx`: SAMPLES `patch-joins` after `patch-subdivision` (5 states: default, G1, G1 alpha 0,5 + joinV 0,2, C1,
  C0 kink, teapot); recorded to new `src/graphs/patches/__parity__/patch-joins.json` (`l58-s2-parity-joins.log`). Mode `none`
  and C0-after-G1 change no shown value, so they are not states.
- `fragments/patchAdvanced.ts`: + 4 mode short labels, 5 legend labels (net A/B, seam, arrow A/B).
- `TensorJoinGraph.tsx`: `JOIN_MODE_KEY`/`JOIN_ALPHA_KEY`, `JoinIds`; `declaresTensorWorkspace` true; bindings (refuse unknown
  mode / alpha outside range with DomainError); declaration: mode = 4-option choice puck, alpha range puck only in G1 (omitted
  otherwise), readout `report` rows state/position-gap/derivative-gap/normal-angle/alpha-star + note `report` (same text as the
  panel), legend surface/net/net-b/points/iso/boundary/seam/arrow-a/arrow-b/point, tensor display actions; capstone: legend
  surface+boundary and actions only. `drawnObject` for net-b/seam/arrows; `puckKeys()` undefined (u, v stay Uredi sliders, no
  step asks to move them). Old `JoinReportPanel` wrapped in `data-declared-panel`.
- `TensorJoinPanels.tsx`: `STATE_KEYS` exported; `JoinModeControls` optional `puckKeys` wraps the select and (in G1) the alpha slider in `PuckOwned`.
- `TensorPatchGraph.tsx`: doc comment of `declaresTensorWorkspace` only. `TensorPatchGraph.declaration.test.tsx`: "stays undeclared" case removed.
- `PatchFirstTask.test.tsx`: joins first = alpha slider, puck `JOIN_MODE_KEY`, mode label absent.
- Lesson: highlights join-c0-calculate / join-c1-observe (position-gap, derivative-gap), join-g1-calculate (state, alpha-star).
- New `TensorJoinGraph.declaration.test.tsx` (6 tests).
- Checks: tsc clean for lane files (only L45's RationalBezierCurveGraph.tsx:23 errors, `l58-s2-tsc1.log`); graph-check
  patch-joins before the lesson/FirstTask edits: contract 1, parity 2, golden 1 (read `src/graphs/patches/__parity__/patch-joins.golden.json`), declaration 6 pass, shared 1 fail
  (PatchFirstTask, since fixed, not rerun) (`l58-s2-gc-joins.log`).
- `just unit src/graphs/patches ... src/localization` (`l58-s2-unit-joins1.log`): 28 failed / 1370 passed, all in
  `TensorJoinGraph.test.tsx` (1) and `TensorJoinPanels.test.tsx` (27). Causes: (a) direct setter calls (`setJoinContinuity`,
  `setJoinAlpha`, `importPresetData` via Reset) now write bound keys outside a write source -> `UntaggedWriteError` /
  `expected undefined to be 'c1'`; wrap them in `act(() => runAs('learner', ...))` like TensorSubdivisionPanels.test.tsx's
  `learner()` helper; (b) `modeSelect()` (getByLabelText patch_join_mode) now finds the choice puck ("no value setter"):
  write the mode through `graph.parameters.write(JOIN_MODE_KEY, ..., 'learner')` after `waitForPucks(JOIN_MODE_KEY)` and read it
  from the puck; alpha in G1 likewise via `puckControl(JOIN_ALPHA_KEY)` (`alphaDescription` null-split: the slider is gone in G1).

### Next
1. Migrate TensorJoinGraph.test.tsx / TensorJoinPanels.test.tsx as above; rerun the unit set, graph-check patch-joins --route
   /patches/joins, golden, preset round trip -t patch-joins, build, `just smoke-lesson patch-joins`, shots of every frame (walk
   script `.command-logs/l58-s2-walk.cjs <url> <prefix> 10`, url `/bezeg-2.0/patches/joins?learn=1`), incl. the teapot frame.
2. patch-triangular (not started).

## Session 3 (started 2026-11-28 10:16)

### patch-joins: tests migrated, all checks green
- `TensorJoinGraph.test.tsx`: `learner()` helper (`act(() => runAs("learner", ...))`) replaces every `act(() => ...)`; values unchanged.
- `TensorJoinPanels.test.tsx`: same `learner()`; mode via the choice puck (`chooseMode` = `chooseOnPuckNow(JOIN_MODE_KEY, ...)`,
  `modeValue` = checked segment); in G1 alpha via `typePuck(JOIN_ALPHA_KEY, ...)` and the puck's aria-valuenow/min/max; the alpha
  test now also asserts no alpha puck outside G1 and no Orodja alpha field in G1; degree group queried with `hidden: true`
  (Orodja folds after Reset / Preset restore, as in TensorPatchPanels.test.tsx).
- Declaration test red once: alpha declared in every mode -> 3 of 6 failed (`l58-s3-decl-red.log`); reverted.
- Checks: joins + panels + PatchFirstTask + declaration 4 files pass (`l58-s3-join3.log`); tsc 0 (`l58-s3-tsc.log`); eslint 0 on
  11 changed files (`l58-s3-lint.log`); `just unit src/graphs/patches src/graphs/base src/learning/content src/localization`
  285 files, 6493 passed, 368 skipped (`2026-11-28T09-20-40-642Z-28952-c87840be.log`); `just unit FirstTask` 105 passed;
  graph-check patch-joins --route /patches/joins PASS (contract 1, parity 2, golden 1, declaration 6, shared 137;
  `l58-s3-gc-joins.log`), golden read `src/graphs/patches/__parity__/patch-joins.golden.json`, states default, join-c0, join-g1,
  join-teapot all unchanged; preset round trip -t patch-joins 1 passed; `just build` pass; `just smoke-lesson patch-joins` 2 passed;
  `just smoke-built demonstrations guided-lessons --grep "patch-joins|joins"` 3 passed.
- Shots (dev 4483, 9 frames incl. completion, `.command-logs/l58-shots/join-{1440,1280}-*.png`): both patches with the blue seam
  and S_A,u / S_B,u arrows; mode puck (frames 0-5), plus alpha puck in G1 (frames 4-5), none on the teapot; readout highlights as
  declared; nothing under cards. Teapot frame: Orodja opens with the capstone text; the teapot renders small (camera of the scene).
- **patch-joins ready.**

### patch-triangular: parity recorded, conversion not started (stopped near the ~110k budget line)
- `parity.test.tsx`: SAMPLES `patch-triangular` after `patch-joins` (6 states: default, (u, v) = (0,2; 0,5), edge w = 0, P111
  selected at (0,2; 0,5), P201 selected, degree 2 + P101 at (0,1; 0,1)); recorded to new
  `src/graphs/patches/__parity__/patch-triangular.json` (`l58-s3-parity-tri.log`). Rows: `w` (+ note `patch_parameter_w_help`),
  and with a selection the Bernstein weight row `patch_triangular_bernstein_weight` (+ note). Weights checked by hand
  (6uvw = 0,18; 3u²w = 0,036; 2uw = 0,16). The golden (`patch-triangular.golden.json`) has the default state only (`w = 0,33`).
- Tree green: the recording run passed; no graph change yet.

### Next
1. patch-triangular conversion per the surface recipe (`08-lane-L53.md`): it extends `BaseSurfaceGraph` directly (no tensor
   workspace hook), so `declaresWorkspace`/declaration, `TriangularIds`, readout rows w + Bernstein weight, legend from the
   scene roles, u/v pucks only if a step asks (lessons `patch-advanced-triangular` step `triangular-centroid`,
   `patch-advanced-square-triangular` step `compare-domains`: read their prompts first), declaration test, old readout in
   `data-declared-panel`; then the full check list as for joins.
