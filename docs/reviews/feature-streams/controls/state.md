# Controls stream state

Replaces the numbered `handler-handoff-<n>.md` notes (the last was [handoff 5](handler-handoff-5.md)). Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [parallel plan](../../../tasks/feature-streams/controls.md#parallel-plan).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-controls`, `worktree-stream-controls`. Run state: **active**, restarted by the supervisor on the parallel plan (2026-11-08); Wave 1 in progress.
- **Task 2 (shared point controls)** on `master`: `f0548e4d` P1 point rules (`src/graphs/base/points/`), `10b37815` P2 `PointCollection` and extended `PointListInput` (`src/inputs/`), `44c8b288` P3 Interpolation pilot and `add-point` coordinates (Interpolation, Hermite, Correlation), `9ea84ea7` P4 PointSet pilot with `BaseGraph.fitToVisiblePoints`. P5 (curve workspace) and the engineering review: see [P5 status](#p5-and-review).
- Decisions 27–29 and the task-2 User impact bullet are in the [spec](../../../specs/shared-graph-controls.md#decided-in-task-2--2026-11-08). Evidence: `points-p1.md` … `points-p5.md`; briefs `points-p*-brief.md` beside them.

## P5 and review

P5 (curve workspace and PH hodograph, `CurvePointControls.tsx`, `PointCoordinateEditor` deleted) and the review fixes are in the commits listed at the end of this note's history; evidence `points-p5.md`, engineering review of P1–P4 `points-review-eng.md` (no defects). Fixed after review: `constrainPoint` snap tolerance (`1e-9`, as `NumberInput`), the stale `add-point` comment in `model.ts`. Open from the review, for Wave 1 (one worker, owns `src/inputs/PointCollection.*` and the three graphs):

- `PointCollection.tsx:91-96` empties the typed entry before the graph answers; a refused add loses the typed values. `onAdd` should report acceptance and the fields clear only then.
- `HermiteGraph.editPoint` refits on the point alone; it should frame the tangent tips as `addPoint` does (task-0 decision 5).
- Default placement at the coordinate limit can duplicate an earlier point: silent on PointSet (duplicates allowed), and on Interpolation and Hermite the Add button shows no reason for the model's refusal.
- P5: the curve workspace refusal survives Reset, Preset and lesson restore until the next accepted edit (should clear, as decision 17's channel does); a typed `w` edit on the PH hodograph refits nothing (auxiliary board); shared behaviours run on `bezier` and `curve-curvature` only; the old editor's listener-disposal assertions were not carried over.

## Before task 2 is accepted

1. UI and accessibility review of P2–P5 (Sonnet reviewer): focus, `aria-pressed`, unavailable reasons, two `role="status"` regions in `PointCollection` (count line and pressed reason; decision 18), the typed-entry Enter rule (adds when the draft is within `1e-3` of the accepted value), 3-axis wrapping at 310 px.
2. Browser smoke (`bezeg-smoke`, Sonnet, [smoke-tests.md](../../../smoke-tests.md)): PointSet (points, polygon, segments, intervals), Interpolation, Hermite, the curve workspace and the PH hodograph, touch and keyboard, both languages; lessons `interp-fifth-point-added` (view unchanged) and `hermite-locality-six` (refits only at the second add); also decision 6's lesson-view items and the User impact list (carried from handoff 5).
3. Each shared kind on two real graphs: `pointListBehaviour` and `pointCollectionBehaviour` run on Interpolation, Hermite (collection), PointSet and, after P5, the curve workspace.
4. Record the evaluation entry ([do-log](../../../../.agents/skills/subagent-flow-evaluation/SKILL.md#do-log)) for task 2: P4 hit the worker budget at 140k and left its runs unread; P3 stopped with runs queued; both needed handler verification. Briefs with five acceptance items plus a pilot over ~20 subclasses were too large for one worker.

## Open items

- PointSet segments and intervals keep their own add buttons and count lines (`PointSetControls.tsx`); compgeo sweep.
- `PointCollection` pressed reason closes over its render: a change to `min` or `max` alone does not refresh it.
- Placement at the coordinate limit can propose a point equal to an existing one; the graph's model refuses it with its own reason (Interpolation: repeated parameter).
- Carried from handoff 5: `ChoiceSelect` clipped at 200% text (one `test.fail`); count setter's refusal ignores `ReplacementRevision`; De Boor and Interpolation count setters' typed path untested; faint glyph of an enabled count button in the presenting theme; no screen reader run, Chromium only; no shipped graph reaches a refused `axisPoint` drag; `uncaughtSteppers` (five files); nine compgeo live paragraphs and function status groups move to `LiveReadout` in the sweeps; `.inspector-display-graph` fix verified in the fixture only.

## Risks and working notes

- **Machine load:** two workers plus a handler `just unit` run took ~11 minutes per focused compgeo or learning run. Workers left background runs unread at their budget; tell them to run checks in the foreground and read results before returning.
- **Publish:** `just publish --recipe runtime --base <base> --commits <ids>` needs a clean checkout; publish between waves, not while workers edit. Master was red once from another stream's lint error; do not fix their files.
- **Line endings:** after a rebase some files are checked out with LF; match each file's current endings. With Python use `encoding='utf-8', newline=''`.
- **Ports:** 4317 Codex, 4327 previews, 4328 the controls fixture.

## Settings

Handler budget 1.5x (BEZEG_HANDLER_BUDGET_SCALE in this worktree's .claude/settings.local.json): BUDGET SOFT about 262k, BUDGET HANDOFF about 322k for Opus. Set on 2026-11-08 by the supervising "controls stream status" session on the owner's behalf; the file is untracked and gitignored from `e7df5494`.

`--agent bezeg-handler --model opus --permission-mode auto --effort medium`. Routing per the handler card; worker cap per the parallel plan.
