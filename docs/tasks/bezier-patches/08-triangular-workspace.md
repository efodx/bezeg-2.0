# 08 — Triangular workspace and comparison

Status: ready (06 and07 complete); in progress from 2026-10-28, slice 08A [brief](../../reviews/bezier-patches/t08a-brief.md). Source: [demonstrations, rendering contract, P6–P8](../../specs/bezier-patches.md#demonstrations), [ADR0018](../../adr/0018-three-surface-view-adapter.md). Reuse the surface adapter and family Preset owner.

Add `patch-triangular` at `/bezeg-2.0/patches/triangular`: degree1–4 canonical indexed net, barycentric de Casteljau, three distinct iso families, boundary curves, elevation and three-piece subdivision. Provide triangle inset, clamped keyboard u/v with read-only w, three edge-parallel selection lines and Bernstein weight. Add validated triangular Presets/camera restoration through the existing envelope.

Include a comparison view with tensor and triangular patches of the same boundary degree, explaining their distinct domains; this satisfies the optional comparison demonstration without a standalone `patch-compare` route. Both scenes retain their own meaningful mathematical data. There is no existing route removal.

Acceptance: model and graph agree after pointer/numeric/keyboard edits, inset edge/vertex clamps, Reset, Presets, language changes and synchronous multi-action scene writes. Validate net length/canonical order and malformed input. Check actual triangle mesh response during drag, visible target ownership, export labels and no lifecycle accumulation. Preserve07 and all curve behavior.

Verification: focused math/DTO/control tests, `just check`, independent mathematical/engineering/UI review and `$smoke-tester` for affected routes/workflows. Measure default/stress gestures against ADR budgets. Record evidence in `docs/reviews/bezier-patches/triangular-workspace.md`.
