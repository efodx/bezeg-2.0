# Engineering review: shared point controls (6e7f5f2c..9ea84ea7)

No defect found. Risks and nits, by severity.

## Risk
1. src/graphs/base/points/dragConstraint.ts:17-19 - snap() divides without the tolerance NumberInput uses (src/inputs/NumberInput.tsx:146, `+ 0.5 + 1e-9`). Evidence (node): snap(0.15, 0.1) = 0.1 (0.15/0.1 = 1.4999999999999998), snap(-0.15, 0.1) = -0.1; "half away from zero" gives 0.2. The docstring claims "as NumberInput does". Expected: add the same epsilon, plus a decimal-half test (dragConstraint.test.ts:7-10 only uses binary-exact halves 0.25/0.5, so it cannot see this). No current caller passes a decimal step (PointSet and Interpolation pass bounds only), so latent.
2. src/inputs/PointCollection.tsx:91-96 - addAt clears the typed values and calls onAdd(at) with no result. When the graph refuses (PointSetGraph.addPointAt false, range/limit notice), the user's typed coordinates are lost. Expected: keep the fields on refusal (onAdd returns accepted) or document.
3. HermiteGraph.tsx editPoint (refitFor([[value[0], value[1]]])) frames only the point, not its tangent tip, while addPoint frames the tip (HermiteGraph.tsx:251). A typed edit in Catmull-Rom mode moves the tip and neighbours' tips unframed. Expected: use arrowTips(index) there too, or state the asymmetry.
4. src/compgeo/pointSetModel.clamp.test.ts - exercises only constrainPoint/stepPoint plus unchanged model functions; it would pass with PointSetGraph unchanged. Graph-level coverage is only in PointSet.sharedControls.test.tsx and PointSetSegments/Intervals host tests (key at 1024, graph.notice undefined). Fine as a unit test, but do not count it as evidence for decisions 3/7.
5. placeNewPoint default at the limit (placement.ts:20-23, PointSetGraph.tsx:210) goes to last.x-1, which can coincide with an earlier point (e.g. (L-1,0),(L,0) -> duplicate (L-1,0)). pointSetModel.addPoint allows duplicates, so PointSet silently adds a coincident point. Interpolation/Hermite refuse via their parameter checks (reason surfaced to lessons, silent on the button). Expected: documented or avoided.

## Nit
- src/learning/model.ts:471-473 (comment) still says "a refusal at the point maximum changes nothing", but InterpolationGraph.tsx:~262 / HermiteGraph.tsx:~306 now throw DomainError for a refused default add (task-0 decision 6). Update the comment.
- PointSetGraph.host.test.tsx ~217-220: the language-switch test now re-presses Add before asserting English; the reason is stored as a function, so the already-shown text could be asserted after only the switch. PointListInput.props.test covers the live switch per points-p4.md, so intent is kept elsewhere.
- Accessible names: select buttons are now bare "A_0" (aria-pressed) and fields "A_0, x"; the old "Izberi točko A_0" / "Točka A_0: x" context is gone (pointset_select_point, pointset_point_x/y removed from both catalogs, no remaining use). Row group keeps aria-label. Acceptable, but weaker context for screen readers.
- Hermite/Interpolation import DomainError from functions/BaseFunctionGraph: matches base/controls/guard.ts, no action.

## Cleared (no finding)
- Consumers: LessonAction union, Interpolation/Hermite/Correlation handlers and interpolationGuidedLessons.ts (default add, no x/y) agree; no other lesson-action validator or projection touches add-point (grep). TriangulationGraph.addPointAt override still chains super (refit applies). No other caller of the old CountSetter/addPoint() signatures.
- BaseGraph.fitToVisiblePoints is the old 'fit' body with `extra`; navigateBoard delegates unchanged.
- Decisions: drag/key clamp silent (PointSetGraph drag path uses clampToRange, nudge uses stepPoint then movePoint; non-integer deltas still go to nudgePoint); refit only on add/typed edit, never drag/key; explicit `at` wins (placeNewPoint); refused authored add throws DomainError; Escape cancels pending else deselects.
- viewPolicy handles either box orientation and treats the edge as inside. dragConstraint clamp stays on grid, float cleaned to 12 digits; -0 cleaned.
- Language switch: pressed reason stored as a function, re-evaluated in render; count change drops it. ReplacementRevision untouched by PointCollection (values are typed-entry draft, held in NumberInput state).
- Vacuity: points-p1/p3/p4 report mutations for clamp, nudge, refit, default placement, Hermite framing, unconditional refit (lesson-view tests); interpolationLessonViews.test.ts would fail on an unconditional fit (box changes from the nominal). Host test edits are label/DOM migrations; the range-notice assertion became graph.notice undefined and the model value is still asserted.

## Not verified
Did not run tests or the browser; relied on worker mutation reports.
