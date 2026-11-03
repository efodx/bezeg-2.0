# Curves stream: handler handoff 30

Handler 30 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-03 after its 175k soft threshold fired. It replaces [handoff 29](handler-handoff-29.md).

## State

- Branch `worktree-stream-curves` is pushed to `origin/master`; the head is the commit that adds this note. The working tree is clean.
- Nothing is in flight: no workers, no preview (port 4314 is free).
- Settings: handler Opus, `--permission-mode auto`, `--effort medium`; self-watch soft threshold 175k, handoff 215k.
  - Workers: `bezeg-worker` Sonnet `medium`.
  - Reviews: `bezeg-reviewer` Sonnet.
  - Smoke: `bezeg-smoke` Haiku for narrow checks, Sonnet for broad or new-UI checks.

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `73a1d820` | PS-A-5a: P2 lesson actions (handler) + host tests (Sonnet worker, six mutations seen failing) | PS-A-5a/5b row in `docs/tasks/probability-statistics/README.md` |
| `727a7a8f` | PS-A-5b: six-step P2 lesson (handler one-shot text), registration under interim owner `functions-and-calculus/integrals`, preview copy, guided-lesson smoke row; lesson tests (Sonnet worker, every quoted number asserted against the readout and a direct binomial sum, four mutations seen failing) | same row |
| `3acf0bb6` | Evaluation record (curves handler 30) | `docs/agent-workflow/evaluation-log.md` |

Hook design: parameters `binomial-n`, `binomial-p`, `binomial-k`; visibility `poisson-bars`; choices `binomial-normal-example` and `binomial-correction` (`on`/`off`). A lesson step that sets n, p or the Poisson bars refits the view to the bars (the inspector keeps the reader's view); k and the correction keep the view. Lesson numbers are written in the readout's own format (0,5881, 0,1841: trailing zeros dropped).

Checks: tsc; full unit suite (1417 s) passed on a clean `origin/master` worktree with the slice diff; after both rebases `src/learning`, the host test and the content/runtime suites passed on fresh clean worktrees at `1fd3d255` and `3acf0bb6`. No mathematical review: the hooks add no mathematics, and the lesson text falls under the one-shot rule; its numbers were recomputed independently by the handler (Python) and by the lesson tests. No browser smoke yet.

## Environment gap (stream worktree only)

In this worktree `src/learning/chapter/guidedExamplePreviews.test.ts` fails for projective-conics (five-point) and numerical-methods (quadrature): the module's `import.meta.glob` misses images that are on disk and committed. A debug test's own glob found them, `touch` did not help, and the same tree passes in a fresh `git worktree add` with a junctioned `node_modules`. Run that test (or the full suite) in a fresh temporary worktree for acceptance until the cause is found. A likely suspect is a per-path Vite/Vitest cache. Not caused by curves changes.

## Next steps, in order

1. **PS-A-5b browser check:** build and preview on port 4314, then `just smoke-lesson prob-binomial-normal` (the row probes the `exact` readout per step: 0.5881, 0.25172, 0.25172, 0.23994, 0.67669, 0.25172). Haiku smoke is enough; ask for a one-line description per screenshot and open the visual ones. Check that step 4 (n = 50) and step 5 (n = 100, p = 0,02, Poisson) show all bars in view. Record the result in the PS-A-5a/5b row.
2. Poster capture for `prob-binomial-normal`: empty its `POSTER_PENDING` entry and its `DemonstrationsPage.test.tsx` exemption, rebuild, then capture (see handoff 28 notes in `curves.md`). It can join a later joint capture.
3. P3 (CLT) per the probability README, then the `probability` chapter (F4), which moves `prob-density` and `prob-binomial-normal` off the interim owner.
4. Low priority, P2 visual notes from the handler 29 smoke: board tick labels use decimal points in Slovenian (check whether other graphs share this); the normal area's dashed outline is not visible though the legend says "dashed"; in the rare example the caption touches the normal peak. Older: function-inspector overflow at 200 % text, `PointListInput` overflow, handoff 24 item 4.

## Lessons for briefs

- Two rebases in one push window: upstream lesson slices keep touching the same lists (`lessonMathNotation`, `lessonCatalog`, smoke `LESSONS`, preview-copy counts). Counts auto-merge silently when both sides bump them by the same amount, so recompute them after every rebase.
- A worker corrected a wrong premise in the brief (n max 200 versus the model's 1000). Check model limits before quoting them in briefs or prose.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-30.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
