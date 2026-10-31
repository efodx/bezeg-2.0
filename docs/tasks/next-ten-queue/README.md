# Next ten tasks: orchestration queue

Status: planned 2026-10-31 against `master` at `8553e15`; no task started. Owner: one Claude handler running a continuous loop under [AGENTS.md](../../../AGENTS.md) and the [delegation workflow](../../agent-workflow.md), handing off to successor handlers through the [Claude handler context budget](../../agent-workflow.md#handler-context-budget-claude).

Sources:
- [Architecture deepening backlog](../../specs/architecture-deepening-backlog.md), tasks in [architecture-deepening-backlog/](../architecture-deepening-backlog/README.md). Status of those tasks is recorded in that README, not here.
- [Bézier drawing playground](../../specs/bezier-drawing-playground.md) (owner-approved 2026-10-31), delivery slices 1–4, and [ADR 0020](../../adr/0020-svg-drawing-playground.md). Status of the four slices is recorded in this file.

## Selection

The queue holds every authorized, unstarted item that is ready now: the six architecture tasks rated *Strong* and the four playground slices.

| Not queued | Reason |
| --- | --- |
| Architecture 3, 6, 8, 10 (*Worth exploring*) | Each depends on a queued task (3 on 2 and 5; 6 on 4; 8 on 7; 10 serializes `model.ts` with 9). They are the next queue: 3, 6 and 8 can form one wave once their predecessors land, then 10. |
| [Learn landing visual alignment](../learn-landing-visual-alignment/README.md) | Owner-approved 2026-10-31, after this queue was drafted. Its four sequential tasks edit only `LearningPage.tsx`/`.css`, with no catalog keys, so they are disjoint from all ten. It is the designated filler for the empty Curves slot in waves 3–4 (see [Waves](#waves)). |
| [Guided example highlights](../guided-example-highlights/README.md) | The spec says implementation is not yet authorized, and tasks 03/04 need owner decisions from audit 00. Its counts (56 examples, 16 figures) predate the Bézier patches chapter and need a re-audit before any start. |
| Lesson-family specs (numerical methods, convexity/hulls, curve geometry, school function graphs, triangulation/Voronoi, B-splines/NURBS, interpolation, sweep line) | Proposed only; implementation not scheduled. |
| [Mobile graph playback](../mobile-graph-playback/graph-adjacent-controls.md) | Backlog; no application change authorized. |

## Queue

IDs: `A<n>` is architecture backlog task *n*; `PG<n>` is playground delivery slice *n*. *Worker* follows the [routing table](../../agent-workflow.md#model-routing): `bezeg-worker` with Sonnet 5.5 `medium` unless stated.

| # | ID | Task | Lane | Primary write set | Depends on | Worker slices | Review |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | A1 | [Preset storage integrity](../architecture-deepening-backlog/01-preset-storage-integrity.md) | Host | `presets/Presets.ts`, `PresetImport.ts`, preset cluster of `BaseGraph.tsx`, `PresetSelector.tsx`, locale catalogs | — | 1 | Engineering (handler if small) |
| 2 | PG1 | Playground drawing model, undo, validation (criterion 1) | Playground | new `src/learning/playground/drawingModel.ts` + tests | — | 1 | Mathematical (Sonnet) |
| 3 | A4 | [Completed generic spline changes](../architecture-deepening-backlog/04-generic-spline-changes.md) | Curves | `GenericBezierSpline.ts`, `JXGGenericSplineCurve.ts`, spline graphs | — | 1 | Engineering + mathematical |
| 4 | A2 | [Figure export operation](../architecture-deepening-backlog/02-figure-export-operation.md) | Host | export cluster of `BaseGraph.tsx`, `export/*`, `SaveImage.tsx`, `PresetSelector.tsx`, `LanguageSelector.tsx`, `localization/index.ts` lock, private-cast tests in `BisectionGraph`/`FixedPointGraph`/`SequenceGraph` tests | A1 merged | 1 | Engineering |
| 5 | A5 | [PH auxiliary-board lifetime](../architecture-deepening-backlog/05-ph-auxiliary-board.md) | Curves | `GraphSession.ts`, PH graphs, `HodographInputBox.tsx` | A4 merged (lane order only) | 1 | Engineering (lifecycle) |
| 6 | PG2 | Playground canvas, pointer/keyboard editing, toolbar, persistence (criteria 2, 4, 8) | Playground | new `DrawingPlayground.tsx` (+ CSS, tests), locale catalogs | PG1 interface fixed | 1–2 | Engineering + UI/accessibility |
| 7 | A7 | [One owner for function-model rules](../architecture-deepening-backlog/07-function-model-rules.md) | Functions | `src/analysis/*Model.ts`, `functionPresetCollections.ts`, function graph setters, locale catalogs | A2 merged (shared function-graph test files) | 2: convexity pilot, then the other ten | Engineering |
| 8 | PG3 | *Look underneath* overlays and one-curve comparison (criterion 3) | Playground | `DrawingPlayground.tsx` overlay parts, locale catalogs | PG2 merged | 1 | Mathematical + UI/accessibility |
| 9 | A9 | [One typed lesson action vocabulary](../architecture-deepening-backlog/09-lesson-action-vocabulary.md) | Learning | `learning/model.ts`, `runtime/lessonCatalog.ts`, `LessonActionRegistry.ts`, `LessonSession.ts`, every guided-lesson content file | A7 merged (README: rebase over 7) | 2: typed vocabulary + review-field decisions + one pilot file, then a scripted migration of the rest | Engineering; notation test covers unchanged mathematics |
| 10 | PG4 | Chapter blocks, bilingual prose, terms, docs, performance, smoke (criteria 5–7, 9) | Playground | `content/bezierChapter.ts`, `ChapterPage.tsx`, `docs/content/bezier-curves.{sl,en}.md`, `docs/localization.md` term table, capabilities/UI docs, ADR 0020 status | PG3 merged | 2: integration + prose; then performance and smoke (`bezeg-smoke`, Sonnet for first-pass new UI) | Engineering + UI/accessibility; content via notation test |

## Waves

At most three workers run at once ([dispatch rule 1](../../agent-workflow.md#dispatch)). A wave starts when a slot frees and the next task's dependency is merged; waves are a planning view, not barriers.

```text
Slot      Host/Functions/Learning   Curves     Playground
Wave 1    A1                        A4         PG1
Wave 2    A2   (after A1)           A5         PG2 (after PG1)
Wave 3    A7   (after A2)           —          PG3 (after PG2)
Wave 4    A9   (after A7)           —          PG4 (after PG3)
```

- **Wave 1: A1, A4, PG1.** Disjoint files: Preset storage, the spline adapter, and new playground files. A1 is small and fixes a user-visible failure; start it first.
- **Wave 2: A2, A5, PG2.** A2 follows A1 on `BaseGraph.tsx` and `PresetSelector.tsx`. A5 touches `GraphSession.ts`, which no other queued task edits. PG2 builds on the fixed PG1 interface; it can start once PG1's exported types are settled, before PG1's tests are final.
- **Wave 3: A7, PG3.** A7 waits for A2 because both edit the function-graph test files. Use the free third slot for reviews, smoke and the A7 second slice.
- **Wave 4: A9, PG4.** A9 waits for A7, since graph lesson handlers may move. PG4 runs beside A9: `bezierChapter.ts` and `ChapterPage.tsx` do not use the lesson-action vocabulary (checked at `8553e15`). PG4 must not edit guided-lesson content files.

If a task stalls, pull the next task whose dependency is merged rather than idling a slot. Do not pull a deferred task (3, 6, 8, 10) before all ten here are accepted or blocked. The Learn landing alignment may take the free Curves slot from wave 3. Give its tasks 1–3 to one worker as a single slice, then its task 4. Record its status in its own README.

## Shared resources

- **`BaseGraph.tsx`:** A1 then A2, in sequence. Neither starts while the other has unmerged edits.
- **Locale catalogs `sl.ts`/`en.ts`:** A1, A2, A7, PG2, PG3 and PG4 may add keys. Each worker adds keys in its own contiguous block. The handler integrates one worker at a time and rebases the next; it does not merge catalogs by hand. Run `npx tsc --noEmit --pretty false` and the production build after every localization integration.
- **Worker checkouts:** give each concurrent writer its own worktree branch, and integrate into the handler's branch one at a time. Delete a worktree's `node_modules` junction before removing the worktree, or the main install is wiped.
- **Tests:** always through `just` (machine-wide test slots). Iterate with `just unit <file>`; run the full unit suite once per slice. Concurrent Playwright runs use distinct `SMOKE_PORT`s.
- **Stale line references:** the architecture task files cite line ranges at `2f602d0` (2026-10-25), more than 200 commits ago, before the surface-view switch-over, the patches chapter and the lesson overlay changes. Briefs tell workers to locate code by search. A9's content file set now includes the four `patchChapter*.ts` files.

## Loop protocol

For each task: read its task file (or the playground spec section) → write a brief in the `handoff-v12` format with acceptance, write set and checks → dispatch and start its watcher → review → handler verification → commit → push → record status.

1. **Start.** Run `python tools/agent-usage/claude_worker_watch.py --self --until 150000` in the background when delegated work starts. Record each dispatch timestamp, settings and brief revision.
2. **Accept.** Check the diff against acceptance, confirm each new test's observed pre-change failure, route reviews per [review routing](../../agent-workflow.md#review-routing), and run the task's listed verification. Browser checks follow each task file. Smoke only where the task names it: A1 and A7 focused checks, A2 export in both languages, A9 one lesson per family, PG2–PG4 as in the spec.
3. **Commit and push.** Use small commits per task with explicit paths. Fetch, rebase only the new commits onto `origin/master`, recheck, and `git push origin HEAD:master`. Pushing deploys GitHub Pages. PG1–PG3 ship unmounted code, so readers see no change until PG4.
4. **Record.** Update the architecture README status line per task, with evidence next to the task file as the README asks. Update the playground rows in the table below. Log delegation outcomes with the `subagent-flow-evaluation` skill (`do-log`).
5. **Hand off.** At 150k, dispatch nothing new, finish and integrate running work, then watch to 190k. Write `docs/reviews/next-ten-queue/handler-handoff-<n>.md` and launch the successor:
   `claude --bg -n "next-ten-queue handler <n+1>" --agent claude --model <own model> --permission-mode <own mode> "Continue docs/tasks/next-ten-queue/README.md from docs/reviews/next-ten-queue/handler-handoff-<n>.md under AGENTS.md."`
6. **Finish.** When all ten are accepted or blocked, write a final note and do not launch a successor.

### Stop conditions

Stop the loop and report with a paste-ready prompt for any of these:
- a rebase conflict on push;
- a failed step that would repeat;
- a performance miss for PG4 criterion 5 (median above 16.7 ms on desktop or 33.3 ms throttled). The spec requires reporting a miss to the owner before release, so do not push PG4's chapter integration;
- a suspected defect that a failing test cannot confirm;
- a change that would break a stored Preset or route without a recorded reason.

Decisions the handler makes without stopping (record each in the named spec):
- A9's review fields (`learnerInteraction`, `expectedObservations`, `expectedState`, sources, `step.action`): record in the Guided lessons spec.
- New Slovenian playground terms: follow [choosing new terms](../../localization.md#choosing-new-terms) and record them in the term table.
- Deliberate differences found in inventories.

## Playground slice status

| Slice | Status | Evidence |
| --- | --- | --- |
| PG1 | planned | — |
| PG2 | planned | — |
| PG3 | planned | — |
| PG4 | planned | — |
