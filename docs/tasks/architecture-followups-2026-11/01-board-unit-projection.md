# 01 — Own board-unit projection

Status: planned, 2026-11-10. Source: [board-unit projection specification](../../specs/architecture-followups-2026-11.md#1-board-unit-projection), acceptance B1–B4. Independent of tasks 02 and 03.

## Outcome and scope

One pure module owns the conversion from exact grid geometry to board-unit quantities for Orientation, Signed area, Notable points and Euler line. The caller supplies the grid step without restating how coordinates, lengths, doubled areas or squared radii scale.

Start at `src/compgeo/pointSetModel.ts:gridToBoard`, `notablePointsModel.ts:analyseNotablePoints`, `eulerLineModel.ts:analyseEulerLine`, `src/graphs/compgeo/orientationReadout.ts`, `areaReadout.ts`, and their four graph consumers. Reuse existing Rational arithmetic. Keep exact predicates, lattice eligibility, formatting/localization and family validity decisions in their current modules. No whole-compgeo migration or general units library.

## Work

1. Inventory the dimensional conversions in these consumers and the existing fine-grid host regressions. Choose the smallest interface that hides all repeated scale rules without replacing family analyses.
2. Migrate Orientation and Signed area first, including labels and panel readouts; remove caller-doubled exponents and the exposed formatting scale contract.
3. Migrate Notable points and Euler line to the same projection owner, retaining exact rational centres, squared quantities, board caps and inexact-only quantities.
4. Remove superseded conversion logic and document the new ownership in the relevant architecture guidance. Presets and grid encoding remain unchanged.

## Verification and completion

- Cover B1 with a consumer search/diff inventory naming the rules removed from callers.
- Cover B2–B3 with independent numerical oracles and the existing tests in `src/compgeo/notablePointsModel.test.ts`, `eulerLineModel.test.ts`, and `src/graphs/compgeo/{OrientationGraph,PolygonAreaGraph,NotablePointsGraph,EulerLineGraph}.host.test.tsx`. For example, board vertices (0,0), (4,0), (0,3) have determinant 12, area 6, circumcentre (2,1.5) and squared circumradius 25/4. Compare steps 1 and 1/256 in actual graph hosts; require nonempty expected geometry. Retain tiny-area, off-lattice/Pick, degeneracy and cap cases. Confirm a wrong linear-versus-square scale fails the checks.
- Cover B4 through Reset, Preset reload, same-tick scene actions and Slovenian/English readouts; assert board values as well as controls. Use `just unit` with the affected paths, then `just check-changed` against the agreed base. If localization changes, also run the localization-required typecheck and production build.
- Obtain engineering and mathematical review. Use `$smoke-tester` on the four registered graph routes for fine-grid drawing/readouts, a drag, Reset/Preset restore and language switching. Preserve current mathematical content and appearance.
- Close B1–B4 with the revision and observed evidence. The source review's historical defects were already fixed; passing an unchanged regression is preservation evidence, not proof of a new repair.
