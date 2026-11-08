# Brief: controls task 2, slice P5, curve workspace pilot (handoff-v13)

**Role:** implementation worker, may edit the owned paths below. Do not commit, push, or delegate.

**Goal:** the curve workspace's point editing uses the shared point controls and rules, and `PointCoordinateEditor` is gone with its lint exemption. Source: [shared-graph-controls](../../../specs/shared-graph-controls.md): read only Capability catalogue rows C1, C2, C4, C18, C19, Owner decisions 1, 2, 3, 6, 9, 11, task-0 decision 4, task-1 decisions 13, 14 and 24, and task-2 decisions 27–29. Task: [02-shared-point-controls](../../../tasks/shared-graph-controls/02-shared-point-controls.md). Evidence: [points-p1.md](points-p1.md), [points-p2.md](points-p2.md), and how P3 and P4 mounted the controls: [points-p3.md](points-p3.md), [points-p4.md](points-p4.md).

**Settled by the handler**

- The selected curve's points: one `PointCollection` with `removal: {kind: 'last'}` (count, add, remove last), `typedEntry` x/y, no `addMode` (the workspace's Move / Add point / Delete point group stays the board-tool pressed-button group, decision 9), and one `PointListInput` with per-row `onRemove` and the curve's minimum as `minCount`. Point names keep today's `p₀, p₁…` (and `w₀…` on the PH hodograph). Limits: use the curve's own minimum and maximum point counts if the model has them; if it has no maximum, say so in your note and pick the largest count an existing curve control already allows (report it).
- Typed coordinates commit per field on Enter or blur (decision 2); the "Apply coordinates" form button and its all-or-nothing submit go. A typed coordinate has no grid on curves.
- Add without coordinates uses `placeNewPoint` (one unit right of the last point); with coordinates, exactly there. A typed add or typed edit that lands outside the view refits with the graph's own fit (`refitWhenOutside`); a board click or a drag never refits (decision 6).
- A board Delete-mode click on the last remaining point (today silent, `CurveEditingFeature.ts` near line 121) gives a stated reason through a `RefusalChannel` shown in the workspace Edit panel (`src/inputs/RefusalChannel.tsx`; decision 14), cleared by the next accepted edit.
- No arrow-key nudges (decision 11).

**Acceptance**

1. `BaseCurveGraph.workspaceEdit` and `BasePhBezierCurveGraph`'s hodograph editor use the shared controls as settled; `src/graphs/base/PointCoordinateEditor.tsx` and its test are deleted (move any still-relevant assertion to the new controls' tests), and its line in `controlExemptions` (`eslint.config.mjs`) goes; `just lint` clean on your paths. The PH hodograph keeps its auxiliary-board refresh (today `observeBoard`): a drag on either board shows in the list.
2. The list shows current coordinates after a board drag, a board add or delete, Reset, a Preset and a lesson restore (`ReplacementRevision`, decision 24; check `workspaceRevision` keys still work).
3. Mount the curve workspace for `pointListBehaviour` and `pointCollectionBehaviour` (pattern in `src/graphs/base/sharedControls.graphs.test.tsx`), so each kind runs on at least two real graphs with Interpolation (P3) and PointSet (P4). Gaps as `knownGap` with a reason, reported.
4. Tests: decision 6 on the curve workspace (typed add outside refits, inside does not, drag does not); C2 refusal reason at the minimum from both the list and a board Delete-mode click; the PH hodograph list edits `w` points.
5. Existing curve tests pass (`src/graphs/base`, `src/graphs/curves`, the curve smoke spec files are browser-only: do not run them). Update an assertion only where it encoded the removed Apply form, and list each.

**Scope:** owned: `src/graphs/base/BaseCurveGraph.tsx`, `src/graphs/base/CurveEditingFeature.ts`, `src/graphs/base/PointCoordinateEditor.*` (delete), `src/graphs/curves/ph/BasePhBezierCurveGraph.tsx`, their tests, `src/graphs/base/sharedControls.graphs.test.tsx`, the one exemption line in `eslint.config.mjs`, `src/localization/sl.ts`/`en.ts` (remove keys that become unused, such as the Apply form's, only after a search shows no other user). Do not edit `src/inputs/**` or `src/graphs/base/points/**`; report a needed change. Preserve all other working-tree changes.

**Context:** Windows, Git Bash. `core.autocrlf` is true: keep each file's line endings. With Python, open with `encoding='utf-8', newline=''`; never open a file for writing before the content is ready. Verification: `just --list`, then `just typecheck`, `just lint`, focused unit tests for `src/graphs/base` and `src/graphs/curves` (path recipe), `just build` after localization changes; never bare `npx vitest`/`npm test`. Long output to `.command-logs/p5-*.log`; extract failures only. Read by range; locate with search.

**Checks:** mathematical: curve evaluation is untouched; a typed coordinate equals the same point set by drag (one test). For each new assertion show one observed failure before the change or under a deliberate mutation.

**Return (≤350 words):** files changed; acceptance items with `file:line`; removed keys; changed assertions; known gaps; anything unverified. Evidence note (≤60 lines) to `docs/reviews/feature-streams/controls/points-p5.md`. If you get `BUDGET HANDOFF`, stop and write `docs/reviews/feature-streams/controls/worker-p5-handoff.md`.
