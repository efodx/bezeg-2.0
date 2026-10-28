# Bézier patches: implementation tasks

Status: tasks01–10 complete; [ADR0018](../../adr/0018-three-surface-view-adapter.md) selects Three for patch views. Production tasks11–14 remain. Source: [Bézier patches (Bézierjeve krpe)](../../specs/bezier-patches.md).

| Task | Depends on | Completion scope |
| --- | --- | --- |
| [01 JSXGraph upgrade](01-jsxgraph-upgrade.md) | None | Complete: JSXGraph 1.14.1, full 2D parity evidence (P1) |
| [02 Renderer spike and ADR](02-renderer-spike.md) | 01 | Measured prototype of both patch kinds, ADR, drag/orbit budget (P2) |
| [03 Shared curve kernels](03-shared-kernels.md) | None | Dimension-generic de Casteljau, elevation, subdivision and extrapolation; curves delegate unchanged (P3) |
| [04 3D points](04-3d-points.md) | 03 | Complete: optional `Z()`, 3D curves via the kernels, planar-only guards (P4) |
| [05 Tensor geometry](05-tensor-geometry.md) |03,04| Complete: exact tensor algorithms, independent properties/cache tests (P5) |
| [06 Triangular geometry](06-triangular-geometry.md) |03,04,05| Complete: canonical barycentric algorithms and cross-checks (P5) |
| [07 Adapter and tensor workspace](07-surface-adapter-tensor.md) |02,04,05| Owned surface adapter, first route, controls, export, Presets (P6–P8) |
| [08 Triangular workspace](08-triangular-workspace.md) |06,07| Complete: triangle inset/operations, Presets, comparison view, dash-distinguished iso families (P6–P8) |
| [09 Constructions and derivatives](09-construction-derivatives.md) |05,07| Two teaching routes with exact constructions/vectors |
| [10 Subdivision and joins](10-subdivision-joins.md) |07,09| Complete: two teaching routes and licensed32-patch capstone |
| [11 Surface lesson runtime](11-surface-lesson-runtime.md) |08,10| Synchronous capabilities/actions/checkpoints |
| [12 Chapter](12-patches-chapter.md) |08,10| Bilingual11-section chapter and reviewed figures |
| [13 Examples and previews](13-examples-previews.md) |11,12| Every demonstration's guided examples and capture assets |
| [14 Acceptance](14-integrated-acceptance.md) |05–13| Full P1–P10 audit, app checks and documentation |

Execute11 next, then12,13,14. Tasks may have bounded delegated slices with a single owner for shared interfaces; serialize dependencies and browser/timing resources. Task03's historical overlap with [architecture-deepening task06](../architecture-deepening-backlog/06-curve-gesture-mathematics.md) is already resolved by its completion. `patch-tensor` is the first shipped surface route.

Read the source spec and the assigned task before implementing. The handler owns dispatch, review, integration, checks and Git. Implementation workers do not delegate or commit. Follow the [agent workflow](../../agent-workflow.md) for bounded assignments and evidence. Return at most 400 words summarizing changed paths, acceptance covered, check results, unresolved risks and the durable evidence path. Keep bulky output in files under `docs/reviews/bezier-patches/`.
