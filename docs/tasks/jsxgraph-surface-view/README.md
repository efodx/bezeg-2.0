# JSXGraph surface view: implementation tasks

Status: proposed, 2026-10-29. Source: [JSXGraph surface view](../../specs/jsxgraph-surface-view.md). Task 01 is a go/no-go gate; tasks 02–07 start only after it passes or the owner chooses a path.

| Task | Depends on | Completion scope |
| --- | --- | --- |
| [01 Feasibility gate](01-feasibility-gate.md) | None | Minimal adapter on real routes, measured budgets, depth check, ADR 0019 accepted or stop (criterion 1) |
| [02 Projection and camera](02-projection-camera.md) | 01 | Pure projection, independent oracle, Three-free tests, fit (criterion 2) |
| [03 Rendering and depth](03-rendering-depth.md) | 02 | Every scene role styled with 2D tokens, painter's order, four-view check (criteria 2–3) |
| [04 Interaction](04-interaction.md) | 02 | Picking, drag, z-mode, touch, keyboard, framing (criterion 4) |
| [05 Labels and export](05-labels-export.md) | 03 | Occlusion-tested layout, SVG/PNG capture with MathJax labels (criterion 5) |
| [06 Lifecycle](06-lifecycle.md) | 03, 04 | Disposal, remount, cancelled attach (criterion 6) |
| [07 Switch-over and acceptance](07-switch-over.md) | 03–06 | Default view swap, Three removal, previews, full smoke, docs (criteria 7–9) |

03 and 04 can run in parallel once 02 lands: they own separate files, and `jsxSurfaceView.ts` integration stays with one owner. Until 07, `ThreeSurfaceView` remains the default, and the JSX view is selected through `viewFactory` in tests and a development-only switch, so every step can be compared and rolled back.
