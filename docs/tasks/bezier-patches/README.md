# Bézier patches: implementation tasks

Status: tasks 01 and 03 complete; tasks 02 and 04 planned. Source: [Bézier patches (Bézierjeve krpe)](../../specs/bezier-patches.md).

| Task | Depends on | Completion scope |
| --- | --- | --- |
| [01 JSXGraph upgrade](01-jsxgraph-upgrade.md) | None | Complete: JSXGraph 1.14.1, full 2D parity evidence (P1) |
| [02 Renderer spike and ADR](02-renderer-spike.md) | 01 | Measured prototype of both patch kinds, ADR, drag/orbit budget (P2) |
| [03 Shared curve kernels](03-shared-kernels.md) | None | Dimension-generic de Casteljau, elevation, subdivision and extrapolation; curves delegate unchanged (P3) |
| [04 3D points](04-3d-points.md) | 03 | Optional `Z()`, 3D curves via the kernels, planar-only guards (P4) |

Lanes: 01 → 02 (renderer) and 03 → 04 (geometry) can run in parallel. They touch disjoint files, except `package.json` and the lockfile, which only 01 changes. Task 03 must not run concurrently with [architecture-deepening task 06](../architecture-deepening-backlog/06-curve-gesture-mathematics.md), because both touch degree elevation. Tasks for patch geometry, demonstrations, chapter, lessons and acceptance are created after 02's ADR settles the renderer.

Read the source spec and the assigned task before implementing. The handler owns dispatch, review, integration, checks and Git. Implementation workers do not delegate or commit. Follow the [agent workflow](../../agent-workflow.md) for bounded assignments and evidence. Return at most 400 words summarizing changed paths, acceptance covered, check results, unresolved risks and the durable evidence path. Keep bulky output in files under `docs/reviews/bezier-patches/`.
