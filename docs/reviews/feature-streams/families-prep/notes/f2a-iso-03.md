# f2a-iso-03 final evidence (isometry state model and graph)

Files (uncommitted): `src/isometry/isometryModel.ts` (+ `.test.ts`, including the `dilationTurn` field), `src/graphs/isometry/IsometryGraph.tsx` (+ `.test.tsx`), the `isometry_graph_*` block in `sl.ts`/`en.ts`, three term rows in `docs/tasks/isometries/README.md`.

## Fixes this round (test versus code decisions)
1. The mode field label was "Prikaz" / "View", which collides with the inspector tab "Prikaz" (`getByLabelText` found two elements). Code was wrong: now "Način" / "Mode" (the `triangle_solver_mode_label` and `simson_mode_label` precedent).
2. Start view test expected the box to equal `[-20, 20, 20, -20]`; the host widens it to the canvas aspect (got `[-37.5, 25, 37.5, -25]`). Test was wrong: it now asserts the box contains the square `[-VIEW_HALF, VIEW_HALF]^2`.
3. Ownership tests expected `3 * handles` listeners. The graph keeps one disposer per handle (it removes drag, over and out). Test was wrong: expects one per handle, and drag listeners are checked on the handle itself.
4. The predecessor's other expected failures (`dec` output, curve `dataX`, `curvePolygons` counts, line counts, `BooleanField` lookup, template key `isometry_graph_example_${id}`) did not fail; the template key passes the per-key type check, no switch needed.

## Checks (observed)
- `just unit src/isometry src/graphs/isometry`: passed (final run after all restores).
- `npx tsc --noEmit --pretty false`: no output (0 errors, whole project).
- `just lint src/isometry src/graphs/isometry`: passed. `just build`: passed (warnings present in the log, not inspected).
- No trailing whitespace in the isometry files (Grep ` +\r?$` over `src/isometry`, `src/graphs/isometry`; README checked by the same pattern was not rerun after the row edit, rows have none).

## Mutations (each restored, `cmp` identical to the pre-mutation backup `.command-logs/iso03v-<name>.bak`)
- `r90` sine sign: model quarter-turn test and graph L3 rotation test failed.
- Turn parse made lenient (`ok(turn ?? "r0")`): model turn-validation test failed.
- Snap `Math.round` to `Math.floor`: model snapping test and graph drag-snap test failed.
- Ratio snap quarter to half: model ratio test and two graph numeric-input tests failed.
- Frieze window check `> window` to `> window + 5`: model window test and graph frieze test failed.
- `mergedPoly` NaN break removed: merged-data test and the mode test failed. `rosetteMirrorPoly` NaN removed: same two failed.
- Drop `point.off("drag")`: both ownership tests failed.
- `RATIO_STEP` 0.25 to 0.5: keyboard test and numeric-input test failed. `HANDLE_TOUCH_RADIUS` 26 to 10: touch test failed.
- `initialView` halved: start view test failed.
- Coincident status mirror number +1: degenerate-status test failed. Frieze status copies +1: frieze mode test failed.
- Survivor: `Math.round(s.dilationK * 4)` to `Math.trunc(...)` in `deriveSimilarity` passed, an equivalent mutant (the state only holds exact quarters after parse and snap, so rounding is the identity there).
- Not mutated: locale text (the `isometry_graph_*` block is edited concurrently by the repair worker in the same files).

## Acceptance 4 measurements
JSDOM PLACEHOLDERS, not performance results. Browser measurement per docs/performance-plan.md is owed at F2b when the graph gets a route. Revision 019b9edd, dirty. Temporary file `src/graphs/isometry/perfTmp.test.tsx` deleted.
- Mirror drag of `m2q`, 720 frames, each `setPosition` + `triggerEventHandlers(['drag'])` in `act` through the real `wireDrag` path (no extra `board.update`): median 4.81 ms, p95 14.89 ms (all 720 moved the state). An earlier run gave median 3.85 ms, p95 7.54 ms (machine noise).
- Frieze redraw, about 20 periods (80 polygons of 9 vertices, data shifted each update), `board.update()` x 200: 3 merged NaN-break curves median 0.51 ms, p95 1.09 ms; one curve per copy (80 objects) median 1.80 ms, p95 3.78 ms. Merged is 3.5 times faster: kept, no switch. Caveat: the data were synthetic polygons on the graph's board, not `friezePolygons` output (the graph's window of 19 gives 7 polygons only for the default features).

## Doubts and notes for review
- Controls gap for the Controls stream: `src/inputs/` has no checkbox group (fieldset and legend); the four frieze features are four `BooleanField variant="checkbox"` with a shared help id.
- The similarity rotation is applied after the dilation about the same centre (they commute); the L3 composite fixed point (-46/29, 28/29) needs a translation and stays a kernel test.
- `rosettePoint` is state beyond the task scope list (spec L4 step 3, handler-approved). Frieze period is an integer 4..8.
- Frieze: five of the 16 feature subsets reduce the period; the spec states only {V,R,G}. Row `type` shows "ni" then.
- The frieze base copy is its own curve (period 0, identity), distinguishable without colour by the caption "lik".
- The `curve` objects use the `updateDataArray` cast pattern of `LinearMapGraph`.
- Term rows added for *negibna točka*, *razmerje dolžin/ploščin*, *red grupe*: basis "standard usage", no named source checked this session.
- Not smoke-tested in a browser (no route registered).

## Review repairs

Done after the first review of task 03. Files: `IsometryGraph.tsx` (+test), `isometryModel.ts` (+test), the `isometry_graph_*` block (new keys `cap_point`, `cap_vector`, `cap_frieze_type`, `features_group`; reworded `input_help`), the README term row.

1. `view()` caches on the identity of `this.state` (LineGeometryGraph precedent); no `JSON.stringify` per call.
2. `rosetteImages()` splits the derived images into direct, reflected and all once per derived view; the 2 x `ROSETTE_N_MAX` markers index into the arrays.
3. The four frieze checkboxes sit in `role="group"` labelled by a visible "Simetrije vzorca" / "Symmetries of the pattern" (`aria-labelledby`).
4. The rosette handle has the caption "točka lika" / "point of the figure" (the readout "Točka lika").
5. The glide vector is an owned `arrow` from the foot of the origin on the axis, captioned "vektor premika" (the readout "Vektor premika"); visible only for a glide.
6. The frieze type is captioned on the board above the pattern ("tip friza p2mg"); empty when the period reduces.
7. Rosette image captions use `cap_image`: "slika n" (the readout "Slika n (izračunano)").
8. `COORDINATE_BIG_STEP` is 5. The help now states the steps: coordinates 1 (Page keys 5), k 1/4 (1), n and period 1 (2). The classify mirror count has step 1 and big step 1 and is not named in the help (it has only 3 values).
9. Ownership test asserts `drag`, `over` and `out` handler counts ([1,1,1] live, [0,0,0] after a mode change, disposal and unmount); model test for k = 1 with r90 (rotation, the centre is the one fixed point); `n = parseInteger` spacing.

Mutations, each shown failing, then restored (`cmp` identical to `.command-logs/iso03r-graph.bak` and `iso03r-model.bak`): the `over`/`out` offs removed (both ownership tests); `view()` never cached, rosette split never cached and the rosette point caption removed ("view is cached", "board names every element"); group role removed; glide arrow always visible and frieze caption emptied (glide/type test); `cap_image` replaced by bare digits; `COORDINATE_BIG_STEP` 4 (step and help tests); model fixed point forced to 'all' (the new k = 1 r90 test and the other L3 tests). A first attempt with a mutation that crashed `view()` made every test fail and proved nothing; redone with `if (false)`.

Re-measurement, JSDOM PLACEHOLDERS (not performance results), revision bf4c29eb dirty, temporary file deleted:
- Mirror drag of `m2q`, 720 frames through the real `wireDrag` path, a different grid point each frame (720/720 changed the state). Before: median 4.81 ms, p95 14.89 ms (earlier run 3.85 / 7.54). After: median 2.86 ms, p95 4.22 ms.
- Frieze, real `friezePolygons` output of V + G at period 4 (p2mg, 4 elements) with window 40: 80 polygons, `board.update()` x 200. Merged 3 curves: median 0.65 ms, p95 0.91 ms; one curve per copy (80): median 1.61 ms, p95 2.12 ms. Merged stays about 2.5 times faster: kept. All four features at once reduce the period (H + G), so a closed set with four elements was used instead.

Gaps recorded, no code change:
- Touch inputs stay 40 px: `src/graphs/base/WorkspaceControls.css:54` outranks `src/inputs/NumberInput.css:26` (for the Controls stream).
- `HELP_ID` and `FEATURES_LABEL_ID` are fixed ids like the precedents; two instances on one page would collide.
- `parseIsometryState` and `serializeIsometryState` are unused until the F2b registration.
