# Task 5 evidence: typed conic outcomes

## Inventory
Analytical `Conic` (`src/analysis/conic.ts`): now `CircleConic | DirectrixConic`. Circle: `radius`, no directrix. Ellipse/parabola/hyperbola: `directrix` and `focusDirectrixDistance` required. Absent fields are typed `?: undefined` on the other variant so `conic.directrix ?? default` consumers compile unchanged. `circleConic` / `conicFromFocusDirectrix` return the matching variant.

Five-point returns (`src/projective/conic.ts` `conicFromFivePoints`):
1. zero input / wrong count: `invalid`, zero cofactors, no conic/type.
2. all cofactors zero: `pencil`, no conic/type.
3. unique/circle/parabola/hyperbola/ellipse: `unique` with conic + type.
4. line-pair/parallel-lines/double-line: `line-pair` with conic + type.
5. otherwise (`point`, `empty`): `invalid` WITH diagnostic conic + type (second invalid variant).
`FivePointResult` is a 5-variant union; `FivePointStatus = FivePointResult['status']`.

Consumers: `fivePointModel.ts` (evaluate, shownConic), `conicFocalModel.ts`, analysis `conic.ts`, tests. `FivePointScene` stays a flat optional-field record (unchanged; derived view).

## Negative fixtures (`src/analysis/conicTypeContracts.typecheck.ts`, covered by tsconfig `include: src`)
Against old types (`.claude/jobs/t5-old-types.log`): TS2578 Unused '@ts-expect-error' at lines 10, 14, 18 of the fixture as it stood then, now 11, 15, 19 after the handler added an import (circle-without-radius, parabola-without-directrix, unique-without-conic); positive fixtures also failed with TS2322/TS18048 (possibly undefined).
After migration: `just typecheck` passed, 0 errors.

## Removed assertions/casts
Production: `fivePointModel.ts` `solved.conic!` x2; `conic.ts` `as number` x5, `as Directrix` x2; `conicFocalModel.ts:171` two casts. Tests: `scene.conic!` x6 -> `conicOf` guard helper; `r.conic as Conic` x2 -> throw-guards; `view.conic.directrix!` x2 -> kind guard.
Handler repair: the worker left `m.a`, `m.b` and `m.centre` casts in `matchedConicArc`; they restored the invariant that a centred conic has metrics, so C1 covers them. `DirectrixConic` now splits into `ParabolaConic | CentralConic`, and a `conicMetrics` overload returns the required `CentralConicMetrics`; `narrowMetrics` is the positive fixture.
Left: `projective/conic.ts:110`; `fivePointText.ts:94` `scene.type as keyof`; `curveGeometry*` `frame.radius!` (unrelated curvature frame).

## Runtime
No algorithm or value change. One refactor: `conicResidual` uses a private `lineDistance(directrix, p)`, same formula as `directrixDistance`.

## Checks
typecheck pass; unit (analysis conic tests, projective, graphs/projective, ConicFocalGraph host, Pascal lesson) 28 files / 452 tests pass; lesson tests (projective conics/five-point/pole/three-views, school batch C, lessonMathNotation) pass; lint pass.
Environment: worktree lacked node_modules; added a link `node_modules` -> main checkout (git does not list it).

## Acceptance

Value-preservation review of the final diff found no value, variant, doc comment, test guard or fallback finding. Full unit suite, lint and production build passed on the combined tree of tasks 1 and 5; typecheck and the focused suites passed again after rebasing onto `5825ceba`. No runtime branch or readout changed, so under the shared contract no browser run applies.
