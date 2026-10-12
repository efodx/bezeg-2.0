# React architecture refactor tasks

Source spec: [React architecture refactor](../../specs/react-architecture-refactor.md). Each task is one bounded slice, committed separately after review.

| # | Task | Depends on | Findings |
|---|------|------------|----------|
| 1 | [Remove dead legacy layout and debug output](01-remove-dead-code.md) | — | 13, 14 (part) |
| 2 | [Type JSXGraph members and remove `@ts-ignore`](02-jsxgraph-typings.md) | 1 | 14 |
| 3 | [Scene store, `GraphHost` and controller base](03-scene-store-graph-host.md) | 2 | 3, 4, 8, 9, 10 |
| 4 | [Lesson action registry and React-free adapters](04-composition-and-lesson-registry.md) | 3 | 5, 7, 11 |
| 5 | [Per-board display settings and in-place presets](05-display-settings-and-presets.md) | 3 | 1, 2 |
| 6 | [Per-curve geometry cache versions](06-per-curve-cache.md) | — (parallel) | 6 |
| 7 | [`useT()` and subscribable lesson session](07-use-t-and-lesson-store.md) | 3 | 12, 3 (lessons) |

Task 6 is confined to `src/bezeg` and runs in parallel with tasks 1–3; the graph layer's `geometryCache` calls are removed when it integrates.

## Shared verification

- `npx tsc --noEmit --pretty false` and `npm run build`.
- Jest (`CI=true npx react-scripts test --watchAll=false`). In a worktree under `.claude/`, add `--testMatch '**/src/**/*.{spec,test}.{js,jsx,ts,tsx}'`: Jest's default absolute glob treats the backslash before `.claude` as an escape and finds no tests.
- Baseline on `master` at 2026-10-12: 81 suites, 1106 tests passing.
- Browser smoke checks per [AGENTS.md](../../../AGENTS.md) for tasks that change routes, controls, lessons or the workspace.
