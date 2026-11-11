# F2a solids task 03 (all of scope 1-4): FINAL EVIDENCE

Status: done, uncommitted. Observed after the last edit: `just unit src/solids src/graphs/solids` pass (0 FAIL); `npx tsc --noEmit --pretty false` 0 errors; `just lint src/solids src/graphs/solids` pass; `just build` compiled and passed in 13,6 s but the recipe exited 1 with "Build inputs changed while building; provenance was not recorded" because other workers edited files meanwhile (rerun on a quiet tree before the commit); whitespace and control-character greps empty on owned files and both locales; `git diff -U0 -- src/localization | grep -E '^-[^-]'` empty.

Files: model `src/solids/solidsModel.ts` (+test, `stackPair`, `cursor`); `src/graphs/solids/` `SolidsGraph.tsx`, `SolidsPanels.tsx`, `solidsScene.ts`, `solidsCatalog.ts` (washer self-touch comment), `solidsPresetCollection.ts`; tests `SolidsGraph.test.tsx` (42+ cases), `SolidsLifecycle.test.tsx` (real `JsxSurfaceView`, 3 mounts, all modes, import; board, listener, observer, timer, frame back to baseline), `solidsScene.test.ts` (new: section labels, washer orientation); `solids_graph_*` block in `sl.ts`/`en.ts`. Measurement: see the first-half record in ADR 0051 (JSDOM placeholder; phone owed at F2b).

Mutations (each failed the tests, restored, `cmp` clean; backups `.command-logs/sol03i-<name>.bak`, logs `sol03i-mut-<name>.log`): stackPair always sheared (5 fail); cursor parse unchecked (2); `otherExact` of the failing pair (1); `drawable` without `isClosed` (1); section labels dropped (1, after adding a test); washer `reverse` removed (3, after tightening to 2 percent and a sign check); `axisAccepts` always true (4); zero-normal check off (2); drawing cache always redrawn (1, after adding a draw-count test); shear slider shown for the failing pair (1); exact volume row id changed (2); `en` placeholder renamed (1); disc range check off (1); import without `ok` check (1); panel number format fixed to `sl` (1). Three survived first (labels, washer, drawing reuse): the tests were missing or too loose, now fixed. Not mutated: unmount ownership (it is the base class and the probe baseline; the probe test itself fails on any leftover, not mutation-tested).

Defects found by the tests: none in product code. Test-side corrections: the camera moves reuse the drawing but do not produce a new scene revision (the camera is host-side), so reuse is asserted by a `drawSolids` call count; the sphere is radius 3 (volume 113,097); the preset exported after mount carries the fitted camera, so it differs from `defaultPreset` in the camera only.

## Decisions and doubts for review
- Stack pair is derived from the solid (cone = failing pair); the cube stays in stack mode; the shear slider is hidden for the failing pair; the cursor is a stored field (percent slider, steps of 2,5).
- Typed values: integer fields refuse a non-integer or out-of-range value with a range hint; the offset and shear fields round a typed off-grid value to the nearest quarter and say so (shared NumberInput `grid` behaviour), they do not refuse it.
- Preset errors for a mode/solid mismatch name the field `mode` and list the file ids (`cube, triangular-prism, ...`), which are English identifiers in a Slovenian sentence: they are what the file must contain.
- Section vertex numbers are 1-based labels; the y-axis washer touches itself along the welded ring (comment in `washerSolid`).
- Slider Home/End: the shared Slider has no own handler for them (native only), so they are not tested; PageUp/PageDown, Shift+Arrow and field ArrowUp/Down are.
- Not verified: browser smoke test, touch on a device, screen-reader wording, `just build` provenance (above).

## Review repairs

Observed: `just unit src/solids src/graphs/solids` 154 passed, 1 skipped; `npx tsc --noEmit` no errors; `just lint` passed; no trailing whitespace or control bytes in the owned files and both locales. Not observed: a failing run before the fix (the backup of the panel was taken after editing it, so the pre-fix run was not valid); `just build` skipped as briefed; no browser check.

1. Mesh note: done. `solids_graph_mesh_note` is direction-free; `solids_graph_mesh_note_below` is used only for the cone when mesh < exact (`meshNoteKey`, SolidsPanels.tsx). Test: "states no direction ..." (parabola mesh above exact, cone below, revolve y).
2. Shear reason: done (`solids_graph_shear_unavailable`, shown for the cone/cylinder pair). Test "says why the shear is missing".
3. Sphere axis: done; ChoiceSelect `reason` (`solids_graph_axis_sphere_only_x`) keeps the select, inert and described. Same test.
4. Live text: done; `solids_graph_live` and `solids_graph_live_revolve` (names the axis, omits the mode word), no hard-coded punctuation. Test "announces the axis".
5. Slovenian side count: done (`Stranice preseka: {value0}; ploščina: {value1}.`), en keeps its placeholders. Other `solids_graph_*` strings checked: no count-dependent nouns left.
6. Cursor valueText: done (`50 %`, `7,5 %`). Test "gives the cursor slider a value text".
7. Nits: repeated word removed via the revolve live key; section captions for the edge and cut points hidden when kind is empty (test); washerSolid comment in solidsCatalog.ts now says the bowl tip touches the centre of the cylinder's bottom disc at one point.
