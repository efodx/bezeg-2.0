# Inventory part 3: `src/graphs/curves`, `src/graphs/patches` (PARTIAL, see Handoff)

Read from code at the worktree head; nothing observed running. Paths relative to `src/graphs/`. Host Reset `base/BaseGraph.tsx:294` reloads the selected Preset or the default scene and resets the view box (`:351`). Host Fit exists for board graphs only (`base/DemonstrationWorkspace.tsx:233`); surface demos have no navigation buttons (`src/demonstrations.ts:183`).
Base curve panel (all `BaseCurveGraph` graphs): `base/BaseCurveGraph.tsx:170` gives a local `aria-pressed` curve picker (:155-165), board tools Move/Add/Delete as a pressed-button group (:186, C25, decision 9 keeps), and, only when `workspaceUsesStructuredEditing()`, `CurveWorkspaceOperations` (C15) + `PointCoordinateEditor` (C4, C1/C2 via onAdd/onDelete, :180-184). Rows say "base panel" for that.

## Panels

Rows marked (skim) were located by TSV and grep only; their cells list what grep showed, not a full read.

| Panel | Path | Shared | Local | Exception candidate |
| --- | --- | --- | --- | --- |
| ArcLengthParametrization | curves/arclength/ArcLengthParametrizationGraph.tsx:380-410 | C10, C13, C11, C21 (LiveReadout) | C12 own play/pause `Button` (:403) | none |
| CurvatureBezier | curves/bezier/CurvatureBezierCurveGraph.tsx:143-170 | base panel (structured), C13, C21 | none | none |
| CurveEvolute | curves/bezier/CurveEvoluteGraph.tsx:107-112 | C10, C11 | none | none |
| Decasteljau (+ Graph2) | curves/bezier/DecasteljauGraph.tsx:182-190, DecasteljauAnimationControls.tsx:34-56 | C11, C13 | C12 own button row, native `disabled` without reason, C6 (:37-46); `output aria-live` "t = 0.50" (:34) | none; C12 migration |
| Elevation (+ RationalElevation) | curves/bezier/ElevationGraph.tsx:42,102 | C11 | C15 raw `Button` Elevate (:103) | none |
| Extrapolation (+ Rational) | curves/bezier/ExtrapolationGraph.tsx:68-77 | C13 | C15 raw Button | none |
| Subdivision, Subdivision1 (+ Rational) | curves/bezier/SubdivisionGraph.tsx:107-119, SubdivisionGraph1.tsx:150-164 | C11, C13 | C15 raw Button | none |
| AffineTransforms | curves/bezier/AffineTransformsBezierCurveGraph.tsx:70-90 | none | ten `AffineActionButton`s | listed exception stays |
| Bezier (plain) | curves/bezier/BezierCurveGraph.tsx:7 | base panel (structured) | none | none |
| BSplineBasis | curves/bspline/BSplineBasisGraph.tsx:246-262 | C10 (degree select, C26 candidate), C11, C13, KnotEditor | `role=status` readout (:257), `role=alert` notice (:261) | knot vector (listed) |
| BSplineBlossom | curves/bspline/BSplineBlossomGraph.tsx:278-296 | degree and segment selects (C26), C13, C11 | C9 local Reset "Back to the default" (:296) | none |
| BSplineExtraction | curves/bspline/BSplineExtractionGraph.tsx:244-267 | C10 (example select), KnotEditor | C9 local Reset "Back to the example" (:248); per-piece "open as Bezier" buttons (:261) | none |
| BSplineInsertion | curves/bspline/BSplineInsertionGraph.tsx:256-285 | C10, `NumberInput` insert value (:259), C11, KnotEditor | C9 local Reset (:263); `role=alert` refusal (:266, C22 state field) | none |
| BSplineNurbs | curves/bspline/BSplineNurbsGraph.tsx:284-306 | C10, C11, C13, `NumberInput` weights (:299) | C9 local Reset (:306); `role=alert` refusal (:303) | none |
| DeBoor | curves/bspline/DeBoorGraph.tsx:319-345 | degree select (C26), `CountSetter` (:326), C13, PlaybackButtons (C12), KnotEditor | `role=status aria-live=polite` status (:343) | none |
| KnotEditor (helper in 4 B-spline panels) | curves/bspline/KnotEditor.tsx:30-54 | `NumberInput` per knot, arrow step 0.01 (C17), per-field refusal | | knot vectors (listed) |
| CurveComb | curves/comb/CurveCombGraph.tsx:269 | base panel (cubic only, :110), C10, C11, C13, C21 | none | none (skim) |
| CurveEnvelope | curves/envelope/CurveEnvelopeGraph.tsx:234 | base panel, C11, C13, C21 | `CollinearNote` (:37) | none (skim) |
| Hermite | curves/hermite/HermiteGraph.tsx:295-320 | C10, `CountSetter` (:303), `PointListInput`, C11, C13 | `role=alert` notice (:317, C22 state enum) | none |
| Interpolation | curves/interpolation/InterpolationGraph.tsx:266-290 | C10, `CountSetter` (:272), `PointListInput`, C11, C13 | `role=status` readout (:282), `role=alert` notice (:285) | none |
| CurveOffset | curves/offset/CurveOffsetGraph.tsx:311 | base panel (bezier kind only, :110), C10, C11, C13, C21 | none | none (skim) |
| ParametricCurve | curves/parametric/ParametricCurveGraph.tsx:283-292 | C10, C13 | C12 own roll play button (:290) | none; C12 migration |
| AlphaParam, SplineAlphaParam, UniformParam | curves/parametrisations/*.tsx | C13 (8 sliders), C10 | none | none (skim) |
| PH (Base, Cubic, Quintic) | curves/ph/BasePhBezierCurveGraph.tsx:46-60 | `PointCoordinateEditor` for hodograph w only (:51), C11 | none | none |
| FarinPoints | curves/rational/FarinPointsCurveGraph.tsx | C11 | none | none (skim) |
| RationalCircleN | curves/rational/RationalBezierCurveCircleGraphN.tsx | `CountSetter` | none | none (skim) |
| DegreeReduction | curves/reduction/DegreeReductionGraph.tsx:215 | C10, C11, C21 | none | none (skim); not draggable (:53) |
| BaseSpline, CnSpline, G1, G1Symmetric | curves/spline/*.tsx | C11, `CountSetter` (Cn), C13 | none | none (skim); no typed point path |
| SubdivisionCurve | curves/subdivisionCurves/SubdivisionCurveGraph.tsx:340-370 | C10, C11, `CountSetter` (:344), `PointListInput` (:347), PlaybackButtons (C12) | playback Reset "Reset polygon" (:354); status group `aria-live` (:360); `role=alert` notice (:365) | none |
| TensorPatch | patches/TensorPatchPanels.tsx:101-208 | C13 (u, v), C11, C10 (density) | starting-patch Button row (:128, C10); C26 `DEGREES` select (:70); C14 `NO_INDEX` i/j selects; C4 `PointEditor` with Apply button (:86); C20 camera presets + "Reset view" + az/el sliders (:192-196) | patch point choice by index (listed); camera panel |
| TensorSubdivision | patches/TensorSubdivisionPanels.tsx:25-73 | C10, C13, C11 | C6 Elevate native `disabled`, reason in `role=status` help (:45-48) | none |
| TensorJoin | patches/TensorJoinPanels.tsx:21-173 | C10 (mode), C26 `DEGREES` copy (:68), C13, C11 | scene Button row (:21); capstone "Back to the two patches" (:34); B-point `PointEditor` + `NO_INDEX` selects (:97-116) | patch point choice by index |
| TensorDeCasteljau | patches/TensorDeCasteljauPanels.tsx:15-22 | C10, C11 | none | none |
| TensorDerivatives | patches/TensorDerivativesPanels.tsx:12-62 | C11 | four-corner Button group (:14-17) | none |
| CoonsPatch | patches/CoonsPatchPanels.tsx:55-145 | C10 (shown), C11, C13 (camera) | C14 two selects with `NO_SELECTION` (:15, :73-76); `PointEditor` (:79); camera presets + "Reset view" (:131-135) | patch point choice by index; camera panel |
| TriangularPatch | patches/TriangularPatchPanels.tsx:83-169 | C10, C13 (u,v with coupled max, :96-98), C11, C26 `DEGREES` select (:92) | starting-patch Button row (:89); `NO_INDEX` barycentric select (:106); `PointEditor` (:110); camera panel copy (:155-165) | patch point choice by index; camera panel |

Helpers (no controls of their own): patches/BaseSurfaceGraph.tsx, curves/LiveReadout.tsx (C21 source), curves/object/*, *Scene.ts files.

## Open items

**Item 1 (read from code).**
- Coons: boundary control points `c0,c1,d0,d1` x index 0..3, chosen by two selects (`CoonsPatchPanels.tsx:73-76`), edited by `PointEditor` with Apply (:79); no coordinate limit; `movePoint` silently returns for non-finite or unchanged values (`CoonsPatchGraph.tsx:108-115`). Linked corners on: a corner move drags its pair (`moveCoonsPoint`, :114); turning it on snaps each pair to its average (:123); off keeps positions. Reset view fits the camera to boundary points and shown net (:166-168).
- Triangular: degree 1..4 by select (`TriangularPatchPanels.tsx:70,92`); lowering degree interpolates and keeps three corners (`TriangularPatchGraph.tsx:215-221`). `u`,`v` sliders have coupled maxima 1-v, 1-u (`Panels:96-98`); `setParameter` clamps silently (`Graph:226-231`); the inset drag moves to the nearest point of the triangle (:233-238). Index select lists barycentric `(i,j,k)` (`Panels:81,106`). Split preview needs an interior point (`Panels:123`).
- Patch surface drag (`patches/surface-view/jsxInteraction.ts`): a control point is a JSXGraph `point3d` that JSXGraph moves (:8-10); drag emits start/move/end (:98,122,130); no snap, grid, limit or refusal. Shift or the "move height" switch (`zMode`) drags along z (:15-20; panel `CoonsPatchPanels.tsx:141`). Arrow keys orbit the camera and +/- zoom, never move a point (:217-224): no selected-point key path (C16 not offered on surfaces). SubdivisionPatch refuses edits silently while pieces are shown (`TensorSubdivisionGraph.tsx:160-163`); Join refuses all moves in capstone mode (`TensorJoinGraph.tsx:286`) and derived rows are not points (:280-283). Typed path exists for every draggable surface point (index select + `PointEditor`).

**Item 2 (read from code; no runtime check).** Typed path exists on: Bezier, Curvature, Envelope, Comb (cubic only, `curves/comb/CurveCombGraph.tsx:110`), Offset (bezier kind only, `curves/offset/CurveOffsetGraph.tsx:110`) via the base panel; Interpolation, Hermite (points and tangents, `HermiteGraph.tsx:198`), SubdivisionCurve via `PointListInput`; PH hodograph points w (`BasePhBezierCurveGraph.tsx:51`); knots via `KnotEditor`; NURBS weights via `NumberInput`. Only six graphs override `workspaceUsesStructuredEditing` (grep over `src/graphs`). **No typed path for draggable control points on:** Decasteljau (both), Elevation, Extrapolation, Subdivision (Bezier, both), AffineTransforms, Alpha/Uniform/SplineAlpha parametrisation graphs, all rational Bezier graphs (weights typed at `base/controls/RationalBezierCurveControls.tsx:38`, coordinates not), all spline graphs (C1, C2, Cn, G1, G1Symmetric), ArcLength, Comb non-cubic, Offset non-bezier, DeBoor, BSplineBlossom, BSplineExtraction, BSplineInsertion, BSplineNurbs (only weights and knots typed). PH main-board points are function-bound (`curves/object/JXGPHBezierCurve.ts:136`), so inferred not draggable except possibly the start point: unverified. Decision 11's premise is false for these graphs.

**Item 4:** see Local Reset.

**Item 6 (read from code, not run).** Unconditional refit after add: Interpolation `addPoint` -> `fit()` (`InterpolationGraph.tsx:203-212`), Hermite (`HermiteGraph.tsx:231-241`), SubdivisionCurve (`SubdivisionCurveGraph.tsx:250-260`). Lesson dependence: Interpolation scene `interp-fifth-point-added` (`src/learning/content/interpolationGuidedLessons.ts:30,182-184`) adds (5,0) to default view [-5,5,5,-5] (`BaseGraph.tsx:73`): on the edge, so under decision 6 it probably no longer refits and that lesson view changes (inferred). Hermite scene `hermite-locality-six` (`interpolationGuidedLessons.ts:231,351`) adds (5,0) and (6,0); the second is outside the default view, so the final refit still happens and the final view is likely equal (inferred). Subdivision: no `add-point` lesson action (`src/learning/model.ts:539-545` lists set-rule, set-closed, set-overlay), so no lesson depends on its refit. No other lesson uses these add commands in Interpolation/Hermite (grep `add-point` under `src/learning`; Correlation is not mine).

**Item 7 (read from code).**
- Typed clamp in my directories: none. Typed edits are refused with a message: `InterpolationGraph.tsx:179-188`, `HermiteGraph.tsx:179-196`, `SubdivisionCurveGraph.tsx:233-245`, `KnotEditor` via `BSplineBasisGraph.tsx:223-227`. Decision 3 already holds for typed values there. Program-side clamps (not typed fields): Parametric radius (`ParametricCurveGraph.tsx:189`), slider parameters.
- Drag clamps at the limit silently: Interpolation `movePoint` (:152-157), Hermite `movePoint`/`moveTangent` (:159-173), SubdivisionCurve `movePoint` (:218-225). Matches decision 3.
- Drag refusals with reason: Interpolation and Hermite refuse a drag that repeats a parameter (`tryPoints`, Interpolation :145-151 sets `notice: 'coincident'`); fits decision 7. SubdivisionCurve drag never refuses; its Remove refuses below 3 points when closed with a notice (:262-269). No others found.
- Patches: no typed coordinate limit; `PointEditor` refuses only non-finite (`TensorPatchPanels.tsx:95-100`). Sliders clamp silently (`TriangularPatchGraph.tsx:229`, `TensorPatchGraph.tsx:261`, Join alpha `TensorJoinGraph.tsx:204`, split value `TensorSubdivisionGraph.tsx:119`).
- Not checked: knot marker drag clamping (`BSplineBasisScene.ts`), spline and rational drags.

**Item 8 (read from code).** De Boor has no mute-during-Play gate: its `role=status aria-live=polite` paragraph shows `level`, which changes each Play tick (`DeBoorGraph.tsx:320,343`). Sequence is in `functions` (part 1). In my directories no graph has a Play gate: SubdivisionCurve's status group (`SubdivisionCurveGraph.tsx:360`) re-reads round and vertex count each Play step; Decasteljau's `output aria-live=polite` "t = ..." changes continuously while animating (`DecasteljauAnimationControls.tsx:34`). ArcLength, Comb, Offset, Envelope, Reduction and Curvature use `SettledReadout` (500 ms quiet period, `curves/LiveReadout.tsx:4-25`), which damps continuous change but is not a Play gate (no `playing` check found around its `report` calls in `ArcLengthParametrizationGraph.tsx`). Parametric roll: no live region found. The running check is the handler's.

## Exception candidates

- Surface "Reset view" and camera presets (Tensor, Triangular, Coons panels): host Fit and pan/zoom do not exist for surface demos (`src/demonstrations.ts:183`), and the camera is orbit angles rather than a bounding box, so host Fit cannot replace it. Proposal: one shared camera panel with one "Reset view" label (C20 already says one camera panel).
- Patch control-point choice by index (listed): two or three indices, up to 25 points.
- Knot vectors and `KnotEditor` (listed): ordering constraints.
- Affine transform buttons (listed).
- Decasteljau and Parametric roll local playback are C12 migrations, not exceptions.

## Local Reset

Host Reset: `base/BaseGraph.tsx:294`, `reloadSelectedScene` :337-353: reloads the selected Preset (or default), resets the view box, and rebuilds transient state through `importPresetData`. Surface graphs add a camera fit only when no Preset is selected (`patches/BaseSurfaceGraph.tsx:266`).

| Button | Restores | Same as host Reset? |
| --- | --- | --- |
| Extraction "Back to the example" `BSplineExtractionGraph.tsx:179,248` | curve data of `state.origin`, clears `moved` | No Preset: equal only if the example select was never changed; `selectExample` replaces `origin` (:186-187), so local returns to the chosen example while host returns to default `quadratic`. Preset selected: `importPresetData` sets `origin` to the Preset data (:74-78), so curve data is equal until the example select is changed. |
| Insertion `BSplineInsertionGraph.tsx:179-187,263` | `origin` data, clears ghost and refusal; keeps `showComb`, `insertValue` | Same pattern (origin set :89-94, replaced :184-187). Host also restores `showComb`, `insertValue` (:44) and the view. |
| Nurbs `BSplineNurbsGraph.tsx:226-234,306` | `origin` points and weights, `t` to default, clears refusal | Same pattern (:104-112, :233-234). Host also restores `showCircle` and the view. |
| Blossom "Back to the default" `BSplineBlossomGraph.tsx:197-200,296` | `initialData()` (hardcoded default) | No Preset: same data as host (inferred; `defaultPreset()` at :56 not compared). Preset selected: differs, local ignores the Preset; host returns to it. No example select. |
| De Boor "Back to level 0" `DeBoorGraph.tsx:224-228,339` | playback only | Not equal by design (playback Reset). |
| SubdivisionCurve "Reset polygon" `SubdivisionCurveGraph.tsx:208,354` | round 0, the polygon and closed flag the scene started with (`start`, :49,99); stops playback; keeps rule and overlay | Polygon equals host's in both Preset cases (`start` records the imported Preset); host also resets rule, overlays and view. Not equal in scope. |
| TensorJoin "Back to the two patches" `TensorJoinPanels.tsx:34`, `TensorJoinGraph.tsx:154-156` | leaves capstone, imports `defaultPreset()` | Preset selected: differs (host returns to the Preset). Leaves a mode rather than resetting. |
| Surface "Reset view" | camera only | different scope (see exceptions) |

All from reading code; nothing run.

## Spec differences

- C9 "own Reset buttons in 10 files": in my directories the TSV `Reset=` counts in BaseSurfaceGraph, TensorJoinGraph, TensorPatchGraph, TensorSubdivisionGraph, TriangularPatchGraph, CnSplineGraph and SubdivisionGraph.tsx are comments or method names, not buttons. Real buttons: four B-spline ones, plus DeBoor and SubdivisionCurve playback Resets.
- Decision 11 fails for the graphs listed under Item 2.
- C19 "Subdivision refits on add": true only for `SubdivisionCurveGraph`; no lesson uses it.
- C26 `DEGREES` copies: confirmed at `TensorPatchPanels.tsx:70`, `TriangularPatchPanels.tsx:70`; the Join copy is used at `TensorJoinPanels.tsx:68` (definition not line-checked).

## Handoff

Stopped on the budget signal. Left unread or only skimmed (rows marked skim): CurveComb, Envelope, Offset, Curvature extras, DegreeReduction, rational and spline graphs, parametrisations, Farin, RationalCircleN, Parametric, ArcLength control detail, TensorDeCasteljau and TensorDerivatives graph files. Also unchecked: exact capability cells for many curve rows, whether Nurbs renders `KnotEditor`, knot marker drag clamping, spline and rational drag behaviour, and a final row-by-row comparison with the TSV (every curve and patch `.tsx` appears above by name, but not verified mechanically).
