# Lane L55 notes (patch-tensor, patch-decasteljau, patch-derivatives)

## Session 1 (started 2026-11-28)

- Plan: patch-tensor and patch-decasteljau show no values (goldens hold no rows): parity n/a. patch-derivatives has rows: SAMPLES
  entry `patch-derivatives` recorded first (7 states, setters under `runAs('learner')`).
- TensorPatchGraph is also the base of patch-subdivision and patch-joins (lane L58): the declaration, bindings and sweep lease are
  opt-in (`declaresTensorWorkspace()`, true for this lane's three graphs only), so L58's graphs stay undeclared.

### Session 1 PARTIAL (budget HANDOFF at ~180k)

Done:
- Parity `patch-derivatives` recorded (`src/graphs/patches/__parity__/patch-derivatives.json`, new; 7 states incl. two undefined-normal
  states; `.command-logs/l55-parity-rec.log`). Sample in `parity.test.tsx` after `solids`.
- New fragment `src/localization/fragments/patchTensor.ts` (keys for all three graphs: legend labels, inset help for pucks, order puck
  label/shorts, `patch_derivatives_normal_name` bare name), registered in `fragments/index.ts` (import + 3 spreads).
- `TensorPatchGraph.tsx`: `PATCH_PARAMETER_KEYS` (`patch-u`, `patch-v`), `TensorPatchIds`, `declaresTensorWorkspace()` (default
  `this.constructor === TensorPatchGraph`; DeCasteljau/Derivatives must override to true), `parameterBindings` (u, v -> `setParameter`,
  clamped), `tensorDeclaration()` (u, v board range pucks, labels `patch_parameter_u/v`, no symbol; legend surface/net/points/iso/boundary/
  point; display switches + height-mode as tools actions tab/section display), `declaration()`, `performAction`, `drawnObject`
  (all gated). Sweeps write under an animation lease (`sweepWrite`, released on stop/pause/stopAll). Inset drag runs as learner.
  `puckKeys()` passes keys to the panel.
- `TensorPatchPanels.tsx`: opt-in `puckKeys` prop: u/v sliders in `PuckOwned`, `InsetHelp` names the pucks when owned. L58 users pass
  nothing -> unchanged.
- New `src/graphs/patches/PatchTensorGraph.declaration.test.tsx` (states, arbiter writes, actions, unavailable view, subdivision/joins
  stay undeclared). It passed in the patches run (`.command-logs/l55-unit1.log`), but the red-once check is NOT done yet.
- tsc clean before the panel/test edits (`.command-logs/l55-tsc1.log`).

Placement judgements: u, v pucks (chapter prompts patchChapterBasics.ts:38 "premikaj u", patchChapterEvaluation.ts:13 "premakni u in v",
:30 "premikaj točko po parametrih"); de Casteljau order -> choice puck (3 options; frame `order-columns` "preklopi med vrsticami in
stolpci"); display switches, densities, starting patch, degrees, camera, corner select, control-point chooser/editor stay Orodja.

Unverified / in progress:
- `TensorPatchPanels.test.tsx` half-converted: u/v now read the pucks (`puckValue`, `setOnPuck`), setState calls under
  `runAs('learner')`, the slider test rewritten for pucks. STILL TO DO: the tests that call `expectControlsToMatch` must become `async`
  and `await waitForPucks(PATCH_PARAMETER_KEYS.v)` after `mount()` (lines ~73, 114, 160, 184, 226, 264; and add the wait in the two
  already-async tests at ~235, 245). Then rerun.
- `PatchFirstTask.test.tsx` "patches/tensor" case (line ~92) expects the u, v sliders in Edit: move to the strip as in 688294ccf.

Next:
1. Finish the two tests above; `just unit src/graphs/patches`; red-once on the declaration test (e.g. break `point` visibility).
2. graph-check patch-tensor --route (see runtime/route list), golden check, lesson frames: properties `variation` frame
   uses ['control-net','shading'] open ['tools'] (local `frame()` helper needs an optional `declare`).
3. patch-decasteljau: override `declaresTensorWorkspace` true; choice param `patch-decasteljau-order` (binding: read
   `decasteljauOrder ?? 'rows'`, apply validates, refuse `DomainError(message('invalid_patch_decasteljau_order'))`), label
   `patch_decasteljau_order_puck`, shorts; construction switch tools action; legend stage-1 (`construction`), stage-2
   (`construction-2`) visible = switch on && built construction has the role; wrap `DeCasteljauOrderControl` in `PuckOwned`;
   pass `puckKeys` in its `workspaceEdit`; frame `order-columns` uses the order key. Parity n/a (golden has no rows).
4. patch-derivatives: override true; rows ids `Su`/`Sv`/`Suv` (symbols S_u, S_v, S_{uv}, legend swatches) and `normal`
   (name `patch_derivatives_normal_name`, symbol n; value or `patch_derivatives_normal_undefined`), note = `patch_derivatives_legend`,
   status = degenerate reason (REASON_KEYS in TensorDerivativesPanels); legend su/sv/twist/normal/plane (visibility from
   `buildDerivativesScene`); switches as tools actions; `DerivativesReadout` in `data-declared-panel`; pass `puckKeys`;
   frames partials highlight Su/Sv, normal-twist highlight Suv/normal.
5. All checks of the brief (graph-check x3, golden x3, FirstTask, preset round trip, tsc, lint, shots, build, smoke-lesson).

## Session 2

- Panel tests async + `waitForPucks`; PatchFirstTask tensor case moved to the strip (u, v absent from Edit, pucks present).
- Declaration test renamed to `TensorPatchGraph.declaration.test.tsx` (graph-check looks for `<Graph>.declaration.test.tsx`);
  `test.each([...] as const)` for tsc.
- Red once: `drawnObject('points')` visible forced true -> "net off: consistent, bound and drawn: expected true to be false".
- Frame `variation` (patchGuidedExamplesEvaluation.ts) declares `{uses: ['control-net','shading'], open: ['tools']}` ("Vključi
  mrežo in ploskev"); local `frame()` takes an optional `declare`.
- Checks: tsc 0 (`.command-logs/l55-s2-tsc.log`); eslint 0 (`l55-s2-lint.log`); `just unit src/graphs/patches` pass
  (`l55-s2-unit1.log`); patches+base+learning/content+localization pass (`l55-s2-unit2.log`, 1103 s); graph-check patch-tensor
  PASS (contract, parity n/a, golden, declaration 11, shared 137; `l55-s2-gc-tensor.log`); golden check patch-tensor pass, no
  diff (no rows in any state); FirstTask pass; round trip -t patch-tensor pass; patch-coons golden + parity check pass;
  `just build` pass; smoke-lesson patch-tensor, patch-bilinear-patch, patch-control-net, patch-boundary-iso-curves,
  patch-properties pass (`l55-s2-smoke.log`). Shots `.command-logs/l55-shots-{1440,1280}/patches-tensor-*.png`: patch visible,
  pucks "Parameter u/v 0,5" bottom left, clear of Orodja and Legenda.
- **patch-tensor ready** (lesson-step shots not taken: route shots only).

### patch-decasteljau (session 2)

- `TensorDeCasteljauGraph.tsx`: `declaresTensorWorkspace` true; `DECASTELJAU_ORDER_KEY` choice puck (rows/columns/bilinear,
  shorts for rows/columns, bilinear label "Bilinearno" fits); binding refuses a bad order with `DomainError(invalid_patch_decasteljau_order)`;
  `construction` Orodja action (display); legend `construction`/`construction-2`, visible = switch on and the built
  construction holds the role. Exported `DeCasteljauIds`.
- `TensorDeCasteljauPanels.tsx`: `DeCasteljauOrderControl` optional `puckKey`: when the puck owns the order, the select gives
  way and only its stage help line (colours/dashes per order) stays in Edit.
- Lesson frame `order-columns` declares `uses: ['patch-decasteljau-order']` (string literal: lesson content imports only types
  from graph modules).
- New `TensorDeCasteljauGraph.declaration.test.tsx` (6 states, arbiter refusal, actions). Red once: stage-2 visibility read
  the `construction` role -> "bilinear: expected false to be true", "net off, degree (2, 1): expected true to be false".
- Tests moved: `TensorDeCasteljauGraph.test.tsx` (order on the puck via `chooseOnPuckNow`, parameter writes under learner),
  PatchFirstTask decasteljau plan (starting patch leads; u, v, order on the strip, absent from Edit),
  `patchGuidedExamplesEvaluation.test.tsx:122` and `jsxFraming.test-helper.tsx` Preset imports under `runAs('learner')`.
- Checks: graph-check PASS (`l55-s2-gc-dc.log`); golden pass, no diff (no rows); round trip pass; tsc, eslint 0; shots
  `.command-logs/l55-shots-{1440,1280}/patches-decasteljau-*.png`: pucks u, v, "Vrstni red" (Vrstice/Stolpci/Bilinearno) bottom
  left, construction and patch clear of cards.
- Unit patches+base+learning/content+localization: 6459 passed, 1 failed = `declarationContract` linear-map timeout (60 s, under
  load; not this lane); rerun `-t "linear-map|patch"` 4/4 pass (`l55-s2-unit4.log`, `l55-s2-contract.log`). FirstTask pass,
  `just build` pass, smoke-lesson patch-decasteljau, patch-properties, patch-tensor pass (`l55-s2-smoke-dc.log`).
- **patch-decasteljau ready.**

### Session 2 stop (budget)

Not started: patch-derivatives (plan step 4 above unchanged; parity file already recorded). Not verified: lesson-step shots
for either graph (route shots only); `tests/*.spec.cjs` other than the guided-lesson rows (unified-learning only checks a
preview image name).
