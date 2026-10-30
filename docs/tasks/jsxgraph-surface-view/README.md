# JSXGraph surface view: implementation tasks

Status: task 01 done (gate passed under owner option A, 2026-10-30, [record](../../reviews/jsxgraph-surface-view/gate.md)); 02–06 done ([03D record](../../reviews/jsxgraph-surface-view/measure-2026-10-30-03d.md)); 07 done ([acceptance record](../../reviews/jsxgraph-surface-view/switch-over.md)). All tasks are complete. Source: [JSXGraph surface view](../../specs/jsxgraph-surface-view.md). The gate adapter (`src/graphs/patches/surface-view/jsx*.ts`, `board2d` strategy) is the base; the build-time dev switch `VITE_SURFACE_VIEW` existed until task 07 removed it with the Three view (the `view3d` gate strategy was removed in task 02), and the app-route harness is `docs/prototypes/jsxgraph-surface-view/measure-app.mjs`.

| Task | Depends on | Completion scope |
| --- | --- | --- |
| [01 Feasibility gate](01-feasibility-gate.md) | None | Minimal adapter on real routes, measured budgets, depth check, ADR 0019 accepted or stop (criterion 1) |
| [02 Projection and camera](02-projection-camera.md) | 01 | Pure projection, independent oracle, Three-free tests, fit (criterion 2) |
| [03 Rendering and depth](03-rendering-depth.md) | 02 | Every scene role styled with 2D tokens, painter's order, four-view check (criteria 2–3) |
| [04 Interaction](04-interaction.md) | 02 | Built-in JSXGraph drag wired to edits, keyboard, framing (criterion 4) |
| [05 Labels and export](05-labels-export.md) | 03 | Occlusion-tested layout, SVG/PNG capture with MathJax labels (criterion 5) |
| [06 Lifecycle](06-lifecycle.md) | 03, 04 | Disposal, remount, cancelled attach (criterion 6) |
| [07 Switch-over and acceptance](07-switch-over.md) | 03–06 | Default view swap, Three removal, previews, full smoke, docs (criteria 7–9) |

03 and 04 can run in parallel once 02 lands: they own separate files, and `jsxSurfaceView.ts` integration stays with one owner. Until 07, `ThreeSurfaceView` remained the default, and the JSX view was selected through `viewFactory` in tests and a development-only switch, so every step could be compared and rolled back.
