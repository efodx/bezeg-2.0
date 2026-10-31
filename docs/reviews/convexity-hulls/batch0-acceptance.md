# Convexity and hulls — Batch 0 acceptance

Task: [06](../../tasks/convexity-hulls/06-batch0-acceptance.md). Handler: geometry handler 2 (Opus 5.5), 2026-10-31.

**State: accepted 2026-10-31** by geometry handler 3 at revision aabaf9f (below). `G-CG` is open.

## Evidence per task

| Task | Commit(s) on master | Review and disposition | Checks |
| --- | --- | --- | --- |
| 01 F0, [ADR 0021](../../adr/0021-exact-grid-predicates.md), `grid.ts` | b0507e5 | ADR accepted (option A, exact integer-grid predicates) | — |
| 02 predicates | a03f1fc | Mathematical review: no blocking findings. Deferred: `polygonSimplicity` has no brute-force reference test (low risk) | path unit tests, tsc |
| 03 trace model, monotone chain | 28fc0e7 | Mathematical review: no findings. Deferred: upper-chain pops covered only through the hull oracle | path unit tests; mutation `<= 0` → `< 0` failed 5 tests |
| 04 point-set model | 7ad3ac1 | Handler review fixed huge integers reported as non-integer instead of out of range | path unit tests, tsc |
| 05 point-set graph | 74efb80 (WIP), 8a77382, 5d87af2 | Engineering review: vacuous unmount object check, replaced by an exact-count scene-change test. UI/accessibility review: refused draft reset on blur, always-mounted status region, Add-mode wording for touch, single input labels. All fixed. Handler found a lint error (`set-state-in-effect`) at `just check`, fixed in 5d87af2 | compgeo unit tests, tsc, lint, production build; mutations observed failing: Add-mode guard, drag snap, overlay removal, blur reset, mounted status |

## Full check

`just check` at 3578b97 (5d87af2 before its rebase onto master): typecheck and lint pass; unit tests 5727 of 5729 pass, 304 of 305 files. Failing: `src/graphs/base/presets/PresetCatalog.test.tsx` (the file-contract key list and the importer-definition list each receive an extra `curve-curvature` key). The key comes from the curves stream's curvature graph and was already failing in hosted CI on master (d7204ce, 198c7d0) before any geometry commit of this run. Geometry's collection `compgeo-point-set` is not registered in `PresetImport.ts` and does not enter that test. The curves handler was told on 2026-10-31. The build step did not run because the unit step failed; the production build passed separately at 5c836a2.

`just check` at aabaf9f (geometry handler 3, 2026-10-31; dirty only with untracked `05-*.log` files): typecheck, lint, unit tests 5907 of 5907 in 319 files, and the production build pass (build warnings: Sass deprecation notices only, none mention `src/compgeo/`). Between the two runs the curves stream moved `curve-curvature` out of the file contract (57756e6), and three other streams' lint errors that stopped `just check` before its unit step were fixed by their owners: maps 6c4e553 (`ComplexReciprocalGraph.test.ts`), curves c1ebefb (`PointListInput.tsx`), functions aabaf9f (`schoolFunctions.ts`). No geometry code changed.

## Gaps

- No browser smoke: the point-set graph has no route until F2b (gated by `G-REG`).
- `compgeo-point-set` is registered in `PresetImport.ts` at F2b, so file import of these Presets is not yet reachable.
- `docs/current-architecture.md` names `src/compgeo/` and the point-set graph (eaa0c3e).
