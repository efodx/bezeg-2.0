# Subclass construction leak (Step 8 leftover)

Inventory of constructors with statements after `super(...)` (all under `src/graphs/curves/object/`):

| Class (line of post-super code) | Post-super work | Can throw? |
|---|---|---|
| AbstractJXGSplineCurve (:24) | `generateBezierCurves`, `reconcileSplineDrawing` (creates/relabels points) | yes (model on user data) |
| JXGGenericSplineCurve (:13) | `restore(degree, continuity)`, reconcile | yes |
| JXGRationalBezierCurve (:30) | `setWeights` | not today; guarded for future validation |
| JXGPHBezierCurve (:45) | `setAttributes` | not today; guarded |
| JXGBSplineCurve (:24) | `setSpline`, interval setters | yes; had its own `dispose()` catch |
| JXGBezierCurve, AbstractJXGBezierCurve, JXGQuadraticG1/C1, JXGQubicC2, JXGSymmetricQuadraticG1 | no constructor | n/a |

Fix (one place): `AbstractJXGPointControlledCurve` keeps the pre-construction `objectsList` snapshot and offers
`protected finishConstruction(step)`: on a throw it calls `dispose()`, then `sweepObjectsSince`, and rethrows. All five
subclasses run their post-super code through it (JXGBSplineCurve's ad hoc catch replaced). `dispose()` now also
removes the `update` listener when the board has no renderer (it returned early before).

Tests: `SubclassConstructLeak.test.ts` (5 tests, spy forces a post-super throw; asserts `objectsList.length` and the
`update` listener count return to the pre-construction values).
Before the fix: generic spline `expected 34 to be 3`, rational `expected 24 to be 3`, PH `expected 28 to be 3`.
B-spline passed before (its own dispose guard) and stays as a regression pin. The G1 spline test counts calls so only the
subclass's call throws; its failing-before was not observed (an earlier always-throw version hit the base's guard).

Checks: `just unit src/graphs/curves` passed; `just typecheck` passed; `just check-changed` passed (940s).
Logs: .command-logs/sub-{before,after,curves,tsc,check}.log
