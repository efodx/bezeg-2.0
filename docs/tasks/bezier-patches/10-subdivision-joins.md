# 10 — Subdivision, elevation and joining demonstrations

Status: complete. Routes, review repairs and the licensed teapot capstone are on master; source CI [run 40787953802](https://github.com/efodx/bezeg-2.0/actions/runs/40787953802) passed. Evidence: [subdivision-joins](../../reviews/bezier-patches/subdivision-joins.md); browser limits carried to task 14, teapot framing to task 13. Source: [demonstrations and P5–P8](../../specs/bezier-patches.md#demonstrations), [ADR0018 capstone](../../adr/0018-three-surface-view-adapter.md#defaults-budgets-and-capstone).

Add `patch-subdivision` and `patch-joins` at the specified routes. Expose per-direction split/elevation with exact original/piece correspondence. Show two tensor patches with a shared boundary, C0/C1 net conditions and the G1 distinction; never silently describe tangent-plane agreement as matching derivatives. Define degree/orientation handling through the mathematical model and review it before building controls.

Add the reviewed licensed32-patch teapot as a capstone Preset/scene at tiling8, with optional16 only after stress acceptance. Preserve provenance/license beside the production asset. The capstone does not pretend to have a single editable net or parameter domain. Reuse family Presets, cameras, export and disposal.

Acceptance: independent samples verify piece maps, degree-elevated invariance and cross-boundary derivatives on the actual displayed pair, including non-C1 counterexamples. Render all32 actual capstone owners with no extra default surface. Exercise Reset, Preset restore and language switch; preserve synchronized controls and known files/routes.

Verification: focused mathematical/scene/DTO tests, meaningful join mutation, `just check`, independent mathematical/engineering/UI review, `$smoke-tester` for affected routes, teapot orbit/export/resize and active-frame budget evidence. Record in `docs/reviews/bezier-patches/subdivision-joins.md`.

Carried from task07 engineering review #9: `reconcileView` → `buildScene` re-samples every iso, boundary and mesh vertex on each orbit pointermove and selection change. Harmless for one patch; before the 32-patch capstone, reuse the last scene's geometry when the geometry `revision` is unchanged and measure orbit frames against ADR0018.
