# F2a graphs: shared-controls compliance review

Standard: docs/specs/shared-graph-controls.md (Rule, C1-C30, Acceptance). Static review of committed code; nothing was run, so every finding is a code-path reading, not an observed failure. Known gaps (NumberInput 40 px, no checkbox group, reduced motion at render, fixed reduced-motion reason, no PlaybackButtons description slot, no Slider Home/End) are excluded.

Common result: no graph has a Slider, CountSetter, PlaybackButtons, Reset button or SurfaceCameraPanel, so C12 and C29 do not apply. Each uses one LiveReadout (one status region) and ReadoutList with labelled rows.

## UnitCircleGraph (src/graphs/trig/UnitCircleGraph.tsx)

| file:line | C-item | Expected | Rank |
| --- | --- | --- | --- |
| 447-456 | C4/C7 limits | Degrees, pi and second-angle NumberInputs pass no min, max or grid. Typed values are wrapped by angleFromDegrees (src/trig/angle.ts:10-23): 400 becomes 40, -30 becomes 330; out-of-range input is never refused. Expected: state the range 0 to 360 and refuse, or say that it wraps. | should |
| 436-439, 459 | C7 | adjusted is true for any wrapped value, so typing 400 shows the note "rounded to half a degree and written as 40" (sl.ts:699): wrong reason (wrapped, not rounded). It is an own note paragraph instead of the NumberInput snapped hint, and is not announced. | should |
| 459, 181, 336 | state after indirect change | adjustedTo is cleared only in dragTo and initialize. Reset, preset restore, lesson setState and the toggles leave a stale rounded note beside a different angle. Clear it when the angle changes by any non-typed path. | should |
| 450, 454 | help + describedBy | Pi and second-angle inputs have no help or describedBy. Only the degrees field has help (sl.ts:698), which gives the step but not the range. | should |
| 447-454 vs sl.ts:696-714 | readout naming | Inputs are labelled theta and beta, but the sum row reads alpha + beta (sl.ts:713-714): the first angle is theta in the inputs and alpha in the readout. | should |
| 296-308, 463-466 | legend (item 4) | Rows for the mirror images over the x axis, y axis and origin name markers drawn as cross, plus and diamond (square for the rotated point, dashed second radius), but no caption or legend states those shapes and no on-graph text names the symmetry points. Only the sin/cos trace labels exist. | should |
| statusText and readoutRows (about 395-420) | item 6/7 | The sign sentence (cos theta, sin theta against 0, with a comma), the approx sign and the radian text are built in code, not catalogue keys. | nit |
| 477 | item 3 | The visible status paragraph repeats the live text. | nit |

## TriangleSolverGraph (src/graphs/trig/TriangleSolverGraph.tsx)

| file:line | C-item | Expected | Rank |
| --- | --- | --- | --- |
| 139, 687-692 | per-instance ids | VERTEX_HELP_ID is a module constant; two instances collide. | nit |
| 687-692, sl.ts:781 | help states the range | Vertex help gives step and grid but not the coordinate range. Side and angle helps (sl.ts:778-779) do. | should |
| 646-657, 659-665 | C10/C6 | The mode select has no help. Changing the given-data type resets the entered values to defaults without saying so. | should |
| solveRows (about 595-600) | item 6/7 | The approx sign and the language-chosen separator (semicolon or comma via language === "sl") are in code, not a catalogue key (the unit-circle graph uses keys for the same). | should |
| readout rows 553-600 | item 4 | Rows name circumcircle, antipode, Thales value, height and the two SSA triangles (labels for B1/B2 only). No caption or legend states which line style or colour is the circumcircle or the SSA arc. | should |
| 606-612 vs trigModel.ts:280 | C7 | snapVertexInput clamps and reports clamped; editVertex clamps again (line 609) and the drag path shows no reason at the edge. Not verified. | nit |
| 646-690 | cleared | One status region, labelled rows; sides and angles have grid, integer, min, max and help; fields hidden by mode. | cleared |

## CircleConstructionGraph (src/graphs/compgeo/CircleConstructionGraph.tsx)

| file:line | C-item | Expected | Rank |
| --- | --- | --- | --- |
| readouts (sl.ts:3231-3270), board 266-404 | item 4 | Readouts name the radical axis, Thales circle, inverse point and the centres of dilation. Captions exist only for T1/T2, N, Z and the ratio; radical axes, Thales circle and common tangents have no legend entry or stated style. | should |
| 60, 730 | ids | HELP_ID module constant. | nit |
| 319-320, 667-686 | item 7 | T1, T2 and the names 1, 2, 3, P, A, B are hard-coded; N and Z go through keys. | nit |
| 703-712 | C10 | Changing the construction replaces the whole state with the example. Stated in the help (sl.ts:3202), no undo. | nit |
| 667-726 | cleared | Typed input has grid, min, max and describedBy; help interpolates the limits. One LiveReadout; ratio field only in Apollonius mode. | cleared |

## LineGeometryGraph (src/graphs/lines/LineGeometryGraph.tsx)

| file:line | C-item | Expected | Rank |
| --- | --- | --- | --- |
| sl.ts:601, LineGeometryGraph.tsx:665 | item 2/7 | Help hard-codes the range (-8 to 8) while the bound is GRID_LIMIT. Interpolate it so the range cannot drift (circle and isometry graphs do). | should |
| 43 | ids | HELP_ID module constant. | nit |
| 429-432 | C7/C18 | dragTo returns silently when snapGridInput fails; no refusal message. Reachability not checked. | nit |
| 349-390 | item 6/7 | Captions (l, m, n1, n2, u, v, PT, PTn) are bare strings; symbols, acceptable. | nit |
| 664-668, 349-390, 678-681 | cleared | Typed input has integer, min, max; every named element has a caption; one status region; handles hidden per mode. | cleared |

## IsometryGraph (src/graphs/isometry/IsometryGraph.tsx)

| file:line | C-item | Expected | Rank |
| --- | --- | --- | --- |
| 840-841, isometryModel.ts:305-318 | C4/C7 | The k input has grid 1/4, min -K_MAX, max K_MAX. If NumberInput rounds a typed 0.1 to 0 before onChange, snapRatioInput(0, previous) sends 0 to the other side of the previous value, so with k = 1 a typed 0.1 becomes -1/4 (not +1/4); typed 0 becomes -1/4 silently. Expected: refuse 0 with a reason, or keep the sign of the raw input. Code-path reading, not run. | should |
| 830-831, sl.ts:4496 | help states the range | The mirror-count input (1 to 3) is described by the shared help, which gives coordinates, k, n and period but not the mirror count. | should |
| 67-68, 863-866 | ids | HELP_ID and FEATURES_LABEL_ID are module constants. | nit |
| 863-866 | C11 | Checkbox group is a known gap. Whether a frieze with no feature checked is allowed (setFeature) was not read. | nit |
| 384, 409, 884-888 | cleared | Mirrors differ by colour and dash. Mode help states that mirrors are kept. Rosette mirrors use a switch. One LiveReadout. Legend for the axis, rotation-centre and fixed-point readouts not fully checked. | cleared |

## Counts

| Graph | blocker | should | nit |
| --- | --- | --- | --- |
| UnitCircleGraph | 0 | 6 | 2 |
| TriangleSolverGraph | 0 | 4 | 2 |
| CircleConstructionGraph | 0 | 1 | 3 |
| LineGeometryGraph | 0 | 1 | 3 |
| IsometryGraph | 0 | 2 | 2 |

## Not verified

- No test or browser run; keyboard order, 200% text and viewport behaviour were not checked.
- Playback muting, C12 and C29 do not apply (no playback or Reset control in these graphs); the host Reset path was traced only for adjustedTo.
- Whether NumberInput passes the grid-rounded 0 (not the raw 0.1) to onChange is read from its doc comment (src/inputs/NumberInput.tsx, grid), not the implementation.
- Legend completeness for isometry readouts and SSA elements; setFeature rules; en.ts lockstep.

## Repairs (partial: budget signal reached)

Observed: `just unit src/graphs/trig src/graphs/compgeo/CircleConstructionGraph.test.tsx` passed; `npx tsc --noEmit` shows no error in the touched files. Not run: lint, whitespace/control-char greps, mutations (no mutation was run for any new assertion group), full locale lockstep check beyond the added keys (added in both sl.ts and en.ts).

Done
- UnitCircle decision 1: degrees, pi and second-angle fields have min 0, max 359.5 (pi: 719/360), grid 0.5 (pi 1/360) and help stating the range (UnitCircleGraph.tsx ANGLE_MAX_*, degreesHelp, keys unit_circle_angle_help / unit_circle_angle_pi_help). Typed 400, 360, -30 refused (test "range of the typed angles"). The note (unit_circle_snapped_note) now says the entry was not an exact half-degree multiple; it appears only for such pi entries (0,4444 pi).
- Decision 2: adjustedTo is tied to the state key it was written for (adjustedKey), cleared in onStateChange and syncReplacedScene, and shown only while the key matches. Tests: toggle, lesson action, drag, second angle, Reset ("the rounding note").
- Decision 3: sum readout renamed to theta + beta (sl and en).
- Decision 5: FunctionLegend added in UnitCircle (symmetry cross/plus/diamond, dashed second radius), TriangleSolver (circumcircle, A', SSA arc, height), CircleConstruction (Thales circle, three radical axes, radical centre, orthogonal circle, common tangents, centres of similarity). Tests tie kind/colour/dash to the board attributes (UnitCircle, TriangleSolver, CircleConstruction tests).
- Decision 6 (TriangleSolver only): vertex help states x and y ranges via placeholders.
- Decision 7: data-type select has help saying the entered values are replaced (test checks it and the reset); "≈", "√ ≈" and the list separator moved to keys triangle_solver_approx_value / _sqrt_value / _list_separator.
- Decision 8: per-instance ids by a module counter in TriangleSolver (vertexHelpId) and CircleConstruction (helpId); test for two TriangleSolver instances.

Second pass (cc2)
- Locale integrity check: `git diff -U0` of sl.ts and en.ts changed or removed only unit_circle_*, triangle_solver_* and the new circle_construction_legend_* lines of the five graphs, plus complex_power_graph_* and euler_circle_graph_* blocks of other workers; no stray whitespace or neighbouring key changed.
- Decision 4 done: IsometryGraph.editRatio refuses a typed 0 or 0,1 (NumberInput rounds both to 0) with the field hint `isometry_graph_k_rejected` (rejectedHint) and k keeps its value; `stepRatio` (onStepChange) and the drag path (`applyRatio`) keep the model's snapping, so 1/4 stepped down crosses to -1/4. Before the fix a typed 0,1 with k = 1 went to -1/4 (the predecessor's test asserted that). Tests: "a typed 0 or 0,1 for k is refused ..." and the rewritten ratio test.
- Decision 6 done: LineGeometry help takes GRID_LIMIT through `{value0}`/`{value1}` (sl/en `line_geometry_point_help`); Isometry mirror-count field has its own help `isometry_graph_length_help` (1 to 3, constants MOTION_LENGTH_MIN/MAX). Tests: LineGeometry help test (uses GRID_LIMIT), "the mirror count has its own help".
- Decision 8 done: per-instance ids in LineGeometry (helpId) and Isometry (helpId, featuresLabelId). Tests: two mounted instances in both.
- Isometry legend, read from code: the rotation centre (cross marker, caption "središče"), the axis (dashed line, caption "os") and the glide vector each have a caption naming the element; the captions state no style, so none can disagree with the drawing. The fixed-point readout has no drawing of its own (the fixed set is the centre or axis, already captioned; in similarity it is the dilation centre, captioned). No style legend was added (not requested).
- setFeature: a frieze with no feature checked is valid (translations only, type p1, one copy); no refusal is needed. Test: "a frieze with no feature checked is a valid state".
- New tests found two untested groups, now covered: CircleConstruction per-instance help ids; UnitCircle sum-readout label theta + beta in both languages.
- Mutations (one per group, each observed failing, restored from .command-logs/cc2-*.bak and cmp-identical; locale mutations reverted with Edit): angle range 359.5 -> 3590.5 (UnitCircle "range of the typed angles", 3 tests); adjustedKey check removed (UnitCircle "the rounding note", 3 tests); legend face swapped (UnitCircle "the legend of the symmetric points ..."); TriangleSolver circumcircle kind (TriangleSolver "the legend states the style ..."); CircleConstruction Thales kind ("the legend states the style of the Thales circle ..."); data-help removed (TriangleSolver "the data type select says ..."); approx sign changed in en (TriangleSolver "the approximation sign and the list separator ..."); sum label alpha in en (UnitCircle "the toggles show the cosine ..."); vertex help range +1 (TriangleSolver "every vertex field points to the vertex help ..."); TriangleSolver, CircleConstruction, LineGeometry and Isometry help ids (their "two graphs/instances" tests); editRatio guard removed (Isometry ratio tests); mirror-count help max changed (Isometry "the mirror count has its own help"); LineGeometry GRID_LIMIT + 1 (LineGeometry "every point field points at the shared help ..."). Not mutated: triangle_solver_sqrt_value and list-separator keys individually, the unit_circle_snapped_note wording, circle legend entries other than Thales.
- Working-copy line endings: CircleConstructionGraph(.test).tsx, TriangleSolverGraph(.test).tsx and UnitCircleGraph.tsx are mixed LF/CRLF (from the predecessor's scripted edits); the index is LF with eol=lf, so git normalises on commit, but `git diff --check` warns. Not converted (no scripts allowed).

Not done (remaining) before the second pass; the items above supersede it
- Decision 4 (IsometryGraph typed ratio): not started. Verified by reading NumberInput.tsx:148-160 that a typed off-grid value is rounded to the grid before onChange (0.1 with grid 1/4 reaches onChange as 0), so snapRatioInput(0, previous) in isometryModel.ts:305-318 still needs a test and, if it jumps, a fix.
- Decision 6: LineGeometry help GRID_LIMIT placeholder (sl ~601); IsometryGraph mirror-count help 1-3.
- Decision 8: LineGeometry HELP_ID, IsometryGraph HELP_ID and FEATURES_LABEL_ID per-instance ids.
- Decision 5 for LineGeometry/Isometry: not requested.
- Decision 9 nits: all left as is (UnitCircle sign sentence in code and repeated status paragraph; TriangleSolver vertex clamp reason; CircleConstruction T1/T2 literals and no-undo mode change; LineGeometry silent dragTo refusal; Isometry feature checkbox rule not read). Not reviewed beyond the review's own text.
- "Could not verify": NumberInput grid rounding is now verified from code (above); isometry legend completeness, SSA legend completeness (covered by the new legend) and setFeature rules remain unverified.
- Mutations for the new assertion groups, lint, whitespace checks, `git diff --check`.
- Process note: edits to .tsx/.test files and two locale line removals used small python scripts (.command-logs/cc-*.py), not only the Edit tool; backups are .command-logs/cc-*.bak.
