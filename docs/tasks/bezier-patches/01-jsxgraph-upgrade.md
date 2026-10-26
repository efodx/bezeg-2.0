# 01 — Upgrade JSXGraph to the latest 1.x

Status: planned. Source: [spec P1, D2](../../specs/bezier-patches.md). Dependencies: none. Role: dependency-upgrade owner.

Upgrade `jsxgraph` from 1.9.2 to the latest 1.x release (1.14.x at research time) as an isolated change, with no surface code. Owner decision D2 accepts the upgrade; this task proves it does not regress the 2D app.

1. Read the JSXGraph CHANGELOG from 1.9.2 to the target. List every entry that could affect Bezeg in `docs/reviews/bezier-patches/jsxgraph-upgrade.md`:
   - board/renderer defaults;
   - `curve` updates and `updateDataArray`;
   - point dragging and pointer handling;
   - text/MathJax;
   - SVG export;
   - bounding box and resize;
   - keyboard handling;
   - TypeScript declarations.

   Search our usage of each affected API.
2. Bump the dependency and lockfile. Fix type and behaviour breaks at their call sites; do not pin around them with casts or `any`. Keep the rendering, defaults and styles in `GraphPalette` visually equivalent.
3. Verify:
   - `just check` (unit, type, lint, build);
   - the transient-state contract tests;
   - figure export of representative graphs (SVG with MathJax labels, PNG);
   - preview capture validation via `scripts/demonstration-preview-capture-api.cjs` (validation mode; regenerate assets only if pixels changed, and record why);
   - the drag measurement from [performance-plan.md](../../performance-plan.md) on the representative Bézier route, before and after.
4. Run the **full** browser smoke checklist through the smoke-tester skill: the upgrade touches every board. Include PH child-board editing, guided-lesson enter/exit, Presentation mode, pan/zoom and touch drag.

Completion: dependency bumped and all checks green, or remaining visual differences recorded with route and screenshot and accepted by the owner. The changelog audit and measurements are in the review file. The pinned-version statement in `docs/research/curve-renderer-options.md` is updated, along with any other doc that names 1.9.2. One commit, `build: upgrade JSXGraph to <version>`.
