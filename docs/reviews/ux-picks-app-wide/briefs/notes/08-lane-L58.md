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

## Session 4 (started 2026-11-28 ~10:40)

### patch-triangular: converted, all checks green
- `TriangularPatchGraph.tsx`: `TriangularIds`, `declaration()` (readout groups `bernstein` (only with a selection) then `w`, rows
  `bernstein-weight` (name `patch_triangular_bernstein_weight`, 4 decimals) and `w` (symbol `w`, 2 decimals), notes = the two help
  sentences; legend surface, net, points, highlight, iso-u/v/w, boundary, construction, compare, point; switches as Orodja actions:
  `subdivision-preview` (edit), net/iso/boundary/de Casteljau/shading, `tensor-comparison`, `height-mode` (display)),
  `performAction` under `runAs('learner')`, `drawnObject` (colours from `jsxStyles`; split cut curves count as boundary, split
  pieces and de Casteljau levels (n > 1) as construction). Mathematics untouched.
- Placement: **no pucks**. Neither lesson step asks to set u or v: `triangular-centroid` (scene puts S at the centroid; frames
  read the calculation and observe the edges) and `compare-domains` ("Preveri obe meji in nato prekrivni prikaz v središčni
  točki": check, no setting). u, v sliders and the inset stay in Uredi; the switches are display/setup -> Orodja.
  **Open question for the handler**: the demonstration prompt `prompt_patch_barycentric` ("Premikaj u in v ter opazuj w") does ask
  to move u, v while reading w (the subdivision split puck was justified by a demonstration prompt). If that counts, add u/v range
  pucks bound to `setParameter` (max follows 1 - other) and `PuckOwned` around the two Uredi sliders.
- `TriangularPatchPanels.tsx`: both old readouts wrapped in `data-declared-panel`.
- Fragment `patchAdvanced.ts`: 7 legend keys `patch_triangular_legend_*` (sl + en).
- Own tests: `TriangularPatchEditing.test.tsx` (coordinate fields queried with `hidden: true`: Orodja folds after Preset restore;
  the weight label is now on the card and the hidden Uredi copy: `getAllByText(...)` length 2), `TriangularPatchGraph.test.tsx`
  (degree group `hidden: true`). No `learner()` helper needed: no arbiter-bound key, so no untagged-write check fires; values
  unchanged.
- New `TriangularPatchGraph.declaration.test.tsx` (9 tests). Red once: construction visibility reduced to `showDeCasteljau` ->
  "construction: expected true to be false" in the degree-1 state (`l58-s4-decl-red.log`); reverted.
- Checks: triangular tests 8 files pass (`l58-s4-unit2.log`); tsc 0 (`l58-s4-tsc.log`); eslint 0 on 6 files (`l58-s4-lint.log`);
  graph-check patch-triangular --route /patches/triangular PASS (contract 1, parity 2, golden 1, declaration 9, shared 137;
  `l58-s4-gc.log`), golden read `src/graphs/patches/__parity__/patch-triangular.golden.json` (unchanged, only file of that id);
  broad unit 286 files, 6505 passed, 369 skipped (`2026-11-28T10-04-55-565Z-32756-5424fb74.log`; first try killed by my 598 s
  timeout); FirstTask 105 passed; round trip -t patch-triangular 1 passed; `just build` pass; smoke-lesson patch-triangular
  patch-square-vs-triangular 4 passed; smoke-built demonstrations guided-lessons --grep triangular 5 passed. (Build had to be
  repeated twice: another worker's concurrent edits changed the build inputs between build and smoke.)
- Shots (dev 4483, `.command-logs/l58-shots/tri-{1440,1280}-{centroid,compare}-{0,1,2}.png`, `tri-*-plain-0.png`, script
  `l58-s4-shots.sh`, log `l58-s4-shots.log`): pucks 0 in every frame; Odčitki w = 0,33 with its note; legend lists the drawn roles
  (folded at 1280); nothing under cards; Slovenian throughout. One 1280 compare walk landed back on part 1/2 after Končaj while
  the broad unit run loaded the machine; the rerun (`tri-1280-compare-rerun-*`) reached completion.
- **patch-triangular ready** (pending the u/v puck question).

### Session 4 follow-up: u/v pucks (handler: `prompt_patch_barycentric` counts) - PARTIAL, budget HANDOFF at ~176k
Not started in code; tree green as above. Next, in this order:
1. `TriangularPatchGraph.tsx`: import `PATCH_PARAMETER_KEYS` ("patch-u"/"patch-v") from `TensorPatchGraph`; `parameterBindings()`
   u/v -> `read: this.state[p]`, `apply: setParameter(p, Number(value))` (it clamps to `[0, 1 - other]`, so u + v <= 1);
   declaration `parameters`: two `range` params `placement: "board"`, label `patch_parameter_u/v`, min 0, max `1 - other`
   (`Math.max(0, ...)`), step 0.01, maxDecimals 2. Update the `TriangularIds.param` type and the doc comments (justification:
   `prompt_patch_barycentric` "Premikaj u in v ter opazuj w").
2. Sweeps: copy TensorPatchGraph's `sweepWrite`/`sweepLease`/`releaseSweepLease` (lines 171-207) and release in `stopSweeps`/
   `pauseSweeps` and in the lesson `sweep` callback on stop/pause (TensorPatchGraph 262-266); the constructor's `write` goes through it.
3. Inset `onDrag` (line ~523): wrap in `runAs("learner", ...)` as TensorPatchGraph line 588 does (JSXGraph drag = outside DOM tagging).
4. `TriangularPatchPanels.tsx`: `PuckOwned param={PATCH_PARAMETER_KEYS.u/v}` around the two Uredi sliders (opt-in prop `puckKeys` like
   TensorPatchEditPanel); the inset help text mentions "drsnika zgoraj": check whether it must follow (TensorPatchPanels `InsetHelp`).
5. Tests: `learner()` helper (`act(() => runAs("learner", ...))`) wherever own/shared tests fail on untagged writes; slider
   lookups in TriangularPatchGraph.test.tsx (`control("patch_parameter_u")`) will need the puck (`TensorPatchPanels.test.tsx`
   pattern) - values unchanged. Declaration test: expect the two params, max follows 1 - other, write 0.9 to u at v = 0.5 reads 0.5;
   observed red for the new assertion. PatchFirstTask case for patch-triangular if it asserts the u slider leads Edit.
6. Rerun: declaration test, own tests, tsc, eslint changed, graph-check patch-triangular (parity/golden unchanged), round trip,
   `just unit src/graphs/patches src/learning/content`, build + smoke-lesson patch-triangular patch-square-vs-triangular (rerun once
   on an input clash; inversion/phase/dynamics files belong to another worker), shots 1440/1280 via `.command-logs/l58-s4-shots.sh`.

## Session 5 (2026-11-28 ~10:25-11:00): u/v pucks on patch-triangular, all checks green

- `TriangularPatchGraph.tsx`: `parameterBindings()` binds `PATCH_PARAMETER_KEYS` (`patch-u`, `patch-v`, imported from
  `TensorPatchGraph`) to `setParameter` (clamp `[0, 1 - other]`, so u + v <= 1); declaration `parameters`: two `range` pucks,
  `placement: "board"`, min 0, max `Math.max(0, 1 - other)`, step 0.01, 2 decimals; `TriangularIds.param` and doc comments
  updated (justification `prompt_patch_barycentric` "Premikaj u in v ter opazuj w"). Sweeps write through `sweepWrite` under an
  animation lease (copied from TensorPatchGraph), released in `stopSweeps`/`pauseSweeps` and on lesson sweep stop/pause. Inset
  `onDrag` runs under `runAs("learner")`. Mathematics untouched.
- `TriangularPatchPanels.tsx`: `puckKeys` opt-in prop; `PuckOwned` around the two Uredi sliders; the inset help names the sliders
  above, so it follows the pucks (`TriangularInsetHelp`, as TensorPatchPanels `InsetHelp`) with new key
  `patch_triangular_inset_help_pucks` (sl + en) in fragment `patchAdvanced.ts`.
- Tests (values unchanged): `TriangularPatchGraph.test.tsx` (`learner()` helper around parameter writes and the checked import;
  controls agreement reads the puck `aria-valuenow`; the slider test now drives the pucks: values, `aria-valuemax` 0.5/0.75, clamp
  0.9 -> 0.5, ArrowRight +0.01, Uredi slider gone, puck help shown), `TriangularPatchInset.test.tsx` (pucks instead of sliders,
  `learner()` for setParameters/setState/useStartingPatch), `TriangularPatchEditing.test.tsx` (`learner()` for setParameters),
  `PatchFirstTask.test.tsx` triangular case (u, v absent from Edit, pucks on the strip, as the tensor case).
- Declaration test: every state checks keys/kind/placement and `[min, max] = [0, 1 - other]`; new test: puck write u = 0.9 at
  v = 0.5 reads 0.5, maxima follow. Red: max set to `1` -> 7 failed, "expected [ +0, 1 ] to deeply equal [ +0, 0.6666666666666667 ]"
  (`l58-s5-decl-red.log`); reverted.
- Checks: triangular + shared patch tests 13 files 227 passed (`l58-s5-unit3.log`); graph-check patch-triangular --route
  /patches/triangular PASS (contract 1, parity 2, golden 1, declaration 10, shared 137; `l58-s5-gc.log`), golden read
  `src/graphs/patches/__parity__/patch-triangular.golden.json` (only file of that id, unchanged); golden check pass
  (`l58-s5-golden.log`); round trip -t patch-triangular 1 passed; `just unit src/graphs/patches src/localization` 76 files 1154
  passed; `just unit src/graphs/base src/learning/content` 210 files 5352 passed, 369 skipped; tsc 0; eslint 0 on 8 changed files;
  `just build` pass; smoke-lesson patch-triangular patch-square-vs-triangular 4 passed (no input clash this time).
- Shots (dev 4483, `l58-s4-shots.sh` rerun, overwrote `.command-logs/l58-shots/tri-*`, log `l58-s5-shots.log`): pucks 2 in every
  frame (both lessons 3 frames each and plain, 1440 and 1280), bottom left; Odčitki w = 0,33; nothing read under a card. Marginal:
  at 1440 compare part 2 the comparison tensor net's far corner reaches the Legenda card's left edge (no caption there; unchanged by
  this session).
- Not run: `just unit FirstTask` (only PatchFirstTask), inspector-width shot of Uredi, browser specs beyond smoke-lesson.
