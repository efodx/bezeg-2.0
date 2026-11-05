# Curves stream: handler handoff 44

Handler 44 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-05 after its 175k soft threshold fired. It replaces [handoff 43](handler-handoff-43.md).

## State

- Branch `worktree-stream-curves`, on `origin/master` with the commits below and this note. Clean tree. No preview server, worker or watcher of this handler should be running.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet for new UI and lesson walks, Haiku for narrow rechecks).

## Done this session

Hashes are from before the rebase onto `origin/master`; find them by subject in `git log`.

| Commit | Slice | Evidence |
| --- | --- | --- |
| `6d7757b0` | Audit gaps: L1-A4 through a real `LessonSession`, L2-A4 from the drawn circle after a drag, L2-A6 readout text | One observed mutation each; the L1 test fails only with all three redundant stop paths removed |
| `fc4e42c8` | L1 step 1 no longer shows the arch it asks the learner to predict (`parametric-trace-full`) | Two mutations, real-board last sample equals r(t), `smoke-lesson curve-parametric`, card viewed |
| `bdfee9aa` | CG-B1-5: `curve-geometry` chapter cards, both viewed | Generator and capture tests, mutations, capture freshness held |
| This note's commit | L2 dragging measurement and script, criterion audit, records | [measurement](../../curve-geometry/cg-b1-6-dragging-measurement.md), [audit](../../curve-geometry/cg-b1-6-criterion-audit.md) |

Independent mathematics review of the L2 overlay: no defect, recorded in the audit. Hosted CI on `64d27a5` was still in progress when last read. The full unit suite was **not** run on these commits; only the touched files, `tsc` and lint.

## Next steps, in order

1. `just ci` on the pushed head and on `64d27a5`.
2. Finish CG-B1-6: `just check` (see the risk below), then a two-language browser pass of `/curve-geometry/parametric`, `/curve-geometry/curvature` and the chapter page, **including a live language switch mid-lesson on L1 and L2**, which no smoke row covers, and the partial trace during the roll by eye (`bezeg-smoke` Sonnet). The chapter cards should show their images. Then mark Batch 1 released in both task files.
3. Batch 2: CG-B2-1 comb measurement and its ADR; `scripts/curvature-browser-perf.cjs` is a starting point. `G-CURVE` is open. After family 1: family 5, Batch A (D1, D3). Family 3's task rows read "planned" but are stale.
4. Low priority: families 2, 3 and 4 have no chapter cards at all (`b-splines`, `interpolation`, `probability` are not in `CHAPTER_GUIDED_EXAMPLE_PREVIEWS`, so their examples show no image); the CG-B1-5 commit is the template. Also carried over: P5 line labels (`CorrelationGraph.tsx:233`), faint `prob-correlation` residuals, the ±20 `NumberInput` refusal, items from handoff 34, `BSplineNurbsGraph.importPresetData` building the scene twice.

## Risks and notes

- `guidedExamplePreviews.test.ts` "publishes the school-function-graphs example cards" passed for the CG-B1-5 worker, so handoff 43's red `just check` may be gone. Confirm in step 2.
- `just build` fails with "Build inputs changed while building" if anyone writes during it. Do not run a build beside a writing worker.
- The measurement has no real touch device; CPU ÷4 stands in.
- Carried over from handoff 43: selective poster capture rules, `functions-and-calculus` sits later in Learn than its dependent, the VP9 `bt709` local failure, and the blossom and NURBS items.

## Lessons for briefs

- View captured media as a learner, against what the step asks. The audit, its tests and the worker's copy check all passed a prediction step showing its answer.
- Redundant reset paths mask a mutation. Ask for a mutation of the behaviour, and accept "all paths removed" as the evidence.
- A lesson card can cover every control point; a drag script must hide it first.
- A long Bash call with several heredocs failed to parse and ran nothing. Write documents with the Write tool.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-44.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
