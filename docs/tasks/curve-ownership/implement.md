# Implement curve ownership foundations

Source: [curve ownership spec](../../specs/curve-ownership-refactor.md).

Implement the independent geometry and runtime slices, then integrate export with the runtime owner. Preserve all active functionality, existing file formats and routes. Follow the spec's acceptance criteria and [delegation workflow](../../agent-workflow.md).

- Geometry: numeric model inputs and adapter bindings, rational deletion alignment, focused mathematical/binding regression checks.
- Runtime: owned board session, subscription/deferred work cleanup, unconditional main-board disposal and lifecycle checks.
- Export (depends on Runtime): owned figure module, live-owner batch restore/readiness and capture failure/cleanup checks.
- Handler acceptance: independent mathematical/engineering review, required automated verification, delegated smoke, architecture/capability documentation and small verified commits.

Status: completed on 2026-10-09; see the [verification and remaining coverage](../../reviews/curve-ownership-refactor.md). Implementation commits are `7877469` and `475bb72`; the separate CRA starter-test fix is `01b80ea`. Remaining scene/command/preset-codec migration and a renderer comparison are follow-up architecture slices described in the source assessment, not part of this foundation's completion claim.
