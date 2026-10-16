# 01 Establish the capture checkpoint

Source: [spec](../../specs/representative-demonstration-previews.md), scope, per-demonstration targets and implementation sequencing. Depends on: none.

## Goal and scope

Establish a reproducible route/catalog state before writing recipes or replacing generated assets. Inspect `src/demonstrations.ts`, `src/Routes.tsx`, `src/demonstrationPreviewAssets.ts`, `src/images/demonstrations/catalog/manifest.json`, `tests/smoke-catalog.cjs` and the capture script. Preserve unrelated changes; agree the checkpoint with owners of in-progress demonstrations.

## Deliverables and acceptance

- Record the source commit and relevant dirty files/fingerprint, production preview setup, catalog/route count, genuine own-route previews, placeholders, missing assets and in-progress routes. Derive the inventory from live metadata rather than the planning table's length.
- Refresh the spec's targets for added, removed or renamed routes. Identify any target needing unsupported capabilities and give it an explicit proposed disposition.
- For each shipped route, identify supported controls/actions, expected meaningful outcomes, coordinate/annotation policy and a representative poster checkpoint. Keep initial examples and inputs unchanged.
- Verify feasibility of the three motion pilots: subdivision rounds 0/1/2, consecutive bisection steps, and one original Bézier interior control point moved and returned through existing interaction. Locate relevant readiness/export code without assuming it is callable from the browser capture runner.
- Record the chosen stable build and ownership of shared generation/verification resources. Do not include an unfinished route as ready or accept a copied placeholder as genuine.

## Checks and evidence

Inspect route registration against catalog/mapping/assets and compare hashes to detect copied placeholders. Exercise controls on the stable preview where source inspection does not settle feasibility. Save the inventory and recipe choices in this task's results or the source spec, with limitations and source revision. No full app suite is needed for an inventory-only change.
