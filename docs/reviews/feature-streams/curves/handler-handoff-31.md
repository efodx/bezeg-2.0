# Curves stream: handler handoff 31

Handler 31 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-03 after its 175k soft threshold fired. It replaces [handoff 30](handler-handoff-30.md).

## State

- Branch `worktree-stream-curves` is pushed to `origin/master`; the head is the commit that adds this note. The working tree is clean.
- Nothing is in flight: no workers, no preview.
- Settings: handler Opus, `--permission-mode auto`, `--effort medium`; self-watch soft threshold 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Haiku for narrow checks, Sonnet for broad or new UI.

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `0a0b6e72` | PS-A-5b browser check: `smoke-lesson prob-binomial-normal` passed; full-page screenshots show all bars in view at steps 4 and 5 | PS-A-5a/5b row in `docs/tasks/probability-statistics/README.md` |
| `72a00dd9` | Poster for `prob-binomial-normal` deferred: recipes must cover every shipped id and `monotone-partition`/`monotone-triangulation` (Geometry) have none; note "To Geometry" in `curves.md` | `curves.md` notes |
| `02f70c98`, `39288b58` | PS-B-2a1 CLT model `src/analysis/cltModel.ts` (Sonnet worker), plus the P3 slice plan; LF fix for the task plan | PS-B-2a1 row |
| `ac8b31cb` | PS-A-F4 chapter `probability` owning P1, P2 (Sonnet worker, handler prose fix). **Breaking:** `lesson.functions-and-calculus.integrals.prob-*` ids no longer resolve | `docs/reviews/probability-statistics/ps-a-f4-chapter.md` |
| `31fd0565` | PS-B-2a2 `CltGraph` (Sonnet worker; handler: exact base moments `shapeMoments`, Reset clears the notice); Sonnet review, no blocking | PS-B-2a2 row |
| `f6b7bf48` | Evaluation record (curves handler 31) | `docs/agent-workflow/evaluation-log.md` |

Order note: the chapter (Batch A F4) went before P3 because the spec's Batch B release condition is "Batch A released"; the README's PS-B row records this reading.

Checks: on the rebased tree, `src/learning/content`, `src/learning/chapter`, `LearningPage` and `cltModel` (1346 tests, `--no-fsModuleCache`) and tsc passed before `ac8b31cb` was pushed; graph, model, Presets and localization suites (297) and tsc passed before `f6b7bf48`. Worker checks are in each row. Not run this session: `just check`, full unit suite.

## Next steps, in order

1. **PS-B-2b:** register `prob-clt` at `/bezeg-2.0/probability/clt` (template P2 registration `52a65122`/`06b591d3`: `lesson: false`, `POSTER_PENDING`, recipe in `scripts/demonstration-preview-recipes.cjs`, catalog copy, `graphFactories`, capabilities row, remove `prob-clt` from `PENDING_ROUTE_KEYS` in `PresetCatalog.test.tsx`), then browser smoke (Sonnet, new UI: Next/Play/Reset, sliders, CDF toggle, both languages, 390 px). Watch slider-drag responsiveness at n = 30 (ADR 0031 measured 5.4 ms in Node only).
2. **PS-B-3a/3b:** add `clt-sum` to `LESSON_ANIMATION_IDS` (`src/learning/model.ts`) and lesson hooks, then the seven-step P3 lesson (one-shot text, numbers in the readout's format) as a new section of the `probability` chapter (`src/learning/content/probabilityChapter.ts`), with smoke row.
3. Joint poster capture with Geometry's monotone recipes (note in `curves.md`); `prob-clt` joins it if registered by then.
4. P4 (PS-B-4*), then Batch A/B gates (F6).
5. Low priority: playback buttons give no reason when aria-disabled (shared by CltGraph, BisectionGraph, SequenceGraph); CltGraph-level lifecycle tests (unmount, figure export during playback); P2 visual notes from handoff 30 item 4.

## Lessons for briefs

- Ask workers to report a numeric readout's exact display string against the textbook value; a "within tolerance" grid value (0,0834 for 1/12) is a visible error to students.
- With a worker still editing the stream tree, rebase in a temporary worktree (`git worktree add --detach`, junction `node_modules`, remove the junction with `rmdir` before `git worktree remove`).
- Python edits: preserve the file's line endings (`newline=''` and reuse its `\r\n`).

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-31.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
