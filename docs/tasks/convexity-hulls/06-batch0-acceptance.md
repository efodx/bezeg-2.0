# 06 — Batch 0 acceptance (opens `G-CG`)

Status: accepted 2026-10-31 ([record](../../reviews/convexity-hulls/batch0-acceptance.md)): `just check` green at aabaf9f; `G-CG` open. Source: [spec release batches](../../specs/convexity-hulls-lessons.md#release-batches). Kind: F6, handler.

Batch 0 releases when ADR 0021 is accepted and the core unit tests pass; no learner-visible route is required.

1. Tasks 02–05 accepted with their reviews (mathematical for 02 and 03; engineering for 04 and 05, plus UI/accessibility for 05).
2. `just check` passes at a stable checkpoint; record the revision in `docs/reviews/convexity-hulls/batch0-acceptance.md` with each task's evidence, the review dispositions, and the smoke gap (no route until F2b).
3. `docs/current-architecture.md` names `src/compgeo/` and the point-set graph under *Mathematical implementation and adapters*.
4. Set `G-CG` to `open` in [geometry.md](../feature-streams/geometry.md), push, and confirm hosted CI.
