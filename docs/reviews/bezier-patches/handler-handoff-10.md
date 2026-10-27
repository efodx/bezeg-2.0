# Bézier patches handler handoff 10 — 2026-10-27

Current entry point; supersedes [handoff 9](handler-handoff-9.md) for task 07 state (its Git-state and "Accepted" sections and [handoff 8](handler-handoff-8.md)'s Environment still apply). Objective unchanged: finish `docs/tasks/bezier-patches` tasks 07–14 in index order under AGENTS.md (standing authorization: delegation, commits, fast-forward master push, successor handlers).

## Successor rule (owner instruction, 2026-10-27)

The owner said: "spawn the successor when needed yourself and tell your successor to do the same". The `claude` CLI is not on PATH here, so at each handoff start the successor yourself with the app's `mcp__ccd_session__start_session` (initiation `user_asked`, context `fresh`, `use_worktree: false` so it shares this checkout and branch). Repeat this rule in your successor's prompt and note. Do not run concurrently with the successor: end your turn once it has started.

## Git state

- Local `master` = this note's commit on top of `797a7d7` (C2a), ahead of `origin/master` (`fd1f36d`). **Do not push master** until `validateGeneratedPreviews` accepts a real `patch-tensor` capture (step 3). Progress is pushed to `origin/bezier-patches-wip` (fast-forward from local master).
- `debug.log` is pre-existing and unrelated; leave it.

## Accepted this phase

- **797a7d7** (C2a, Sonnet high, 140.8k / 64 tools, stopped by HANDOFF with all items implemented): Uredi (i, j) index selects + x/y/z editor, `highlight-row`/`highlight-col` polylines (net visible only), Bernstein weight readout (`patchBernstein.ts`, plain text), unit-square inset via new `GraphSession.createAuxiliaryBoard` (`{board, release}`, freed once), az/el sliders (degrees, el clamped to ±`CAMERA_PRESETS.top.el`). `selectPoint` now bumps revision (Three view redraws polylines only on a new revision). 12 new `patch_*` keys; new terms (Bernsteinova utež točke, azimut, višinski kot) in `docs/localization.md` and the spec. Report: [c2a-handoff.md](c2a-handoff.md).
- Mutation evidence for C1b graph tests and C2a (Haiku): [c2-mutations.md](c2-mutations.md) — 14/15 killed after the handler strengthened the export round-trip (camera) and editor alert tests; #15 survivor accepted (jsdom number-input sanitization; graph guard). Remaining step 2 of handoff 9 is done.
- Surface preview capture scoping (Haiku Explore): [surface-preview-scope.md](surface-preview-scope.md).

## Checks at 797a7d7

`npx tsc --noEmit` clean; eslint on `src/graphs/patches` + GraphSession clean; `npx vitest run src/graphs` 103 files / 2149 tests passed (`.command-logs/h10-*.log`); worker ran `just build` (passed) before the handler's two test edits. Not run: full `just check`, browser, smoke.

## Remaining task 07 steps, in order

1. **C2b — surface labels and figure export:** dispatch [c2b-brief.md](c2b-brief.md) as written (bezeg-worker, Sonnet high). It covers on-screen MathJax label overlay, SVG (raster `<image>` + vector visible labels) and PNG export through the shared `FigureCapture` lifecycle, the figure batch for surface graphs, and removing `NO_FIGURE_BATCH`.
2. **C3 — surface preview capture:** from [surface-preview-scope.md](surface-preview-scope.md): one `surface` branch (keyed on `demonstration.view === 'surface'`) in `scripts/demonstration-preview-recipes.cjs`, `scripts/capture-demonstration-previews.cjs` and `tests/smoke-catalog.cjs`; real `patch-tensor` recipe and capture via `just preview`; validator checks for the surface (non-uniform pixels, recipe camera, net inside frame), keeping sha/dims/recipe/count checks; regenerate `demonstrationPreviewAssets.ts` rather than the hand entry. Never fabricate manifest evidence. Then push master.
3. Browser verification (bezeg-smoke): real WebGL, picking, XY/z drag, touch, 390×844 fit, keyboard; inset real sizing/resize/drag/touch and the 3-column xyz editor at narrow width (unverified in C2a); ADR0018 budgets + input-to-visible; full smoke checklist (first surface workspace); measure reconcile cost (full scene rebuild on each reconcile, now also on selection).
4. Engineering + UI/accessibility review (Sonnet) and mathematical review. Math flag from handoff 9 (lowering resamples both directions). UI flags: inset uses hard-coded hex colours (check against DESIGN.md tokens); Prikaz buttons and new Uredi controls have had no visual review; view keyboard does not emit `select` (selection by keyboard is via the native selects).
5. `just check`, docs (capabilities, current-architecture, ui-functionality, spec/task status, `GraphSession.createAuxiliaryBoard` in architecture), evaluation-log records for slices A, B, C1 (old), C1a, C1b, C1c, C2a, mutation slice, C2b, C3; commit, push master.

Then tasks 08–14 in index order.

## Settings

Handler Opus 5.5, auto mode; workers `bezeg-worker` Sonnet high for seams/interaction, Haiku for routine review/mutation runs (Haiku mutation runner's `mut.js` mangled multi-line patterns on rerun; write mutations with exact-string Python replacement and restore from the saved text). Watchers per docs/agent-workflow.md (self watcher at 150k, then 190k). This handler hit 150k after C2a + mutation integration; budget one implementation slice plus its integration per handler.
