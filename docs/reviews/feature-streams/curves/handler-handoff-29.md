# Curves stream: handler handoff 29

Handler 29 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-03 after its 175k soft threshold fired. It replaces [handoff 28](handler-handoff-28.md).

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
| `c2b90da2` | PS-A-4a1: P2 model `src/analysis/binomialNormalModel.ts` (handler) + 52 oracle tests (worker) | PS-A-4a1 row; [evidence](../../probability-statistics/ps-a-4a-model-graph.md) |
| `cfaa45a3` | PS-A-4a2: `BinomialNormalGraph`, messages, `prob_binomial_*` keys, Preset collection, 20 host tests; Sonnet review, one should-fix fixed | PS-A-4a2 row; same evidence file |
| `52a65122`, `a4bbdef5` | PS-A-4b: registered at `/bezeg-2.0/probability/binomial-normal` (`lesson: false`, in `POSTER_PENDING`); browser smoke 10/10 | PS-A-4b row |

Evaluation record: `docs/agent-workflow/evaluation-log.md` (curves handler 29).

## Next steps, in order

1. **PS-A-5a, P2 lesson hooks** (pattern: PS-A-3a, `640ff006`, which added `density-*` actions in `DensityAreaGraph.lessonFunctionActions` and extended the closed lesson parameter names in `src/learning/model.ts`). The graph already has protected `setN`, `setP`, `setK`, `setFlag`, `setExample`, `fitToBars`. Spec steps (P2): B(20; 1/2) k=8; shade to 8; correction off/on (0,18555 vs 0,25117); n = 20, 50, 100; p = 0,02, n = 100 with Poisson; free. Decide whether a fit-view action is needed (n changes move the bars out of view: the example view refits only on n|p change via `exampleView`, so check that a lesson `n` step refits; assert it). Test multi-action scenes in one synchronous sequence.
2. PS-A-5b: the six-step lesson with one-shot text (pattern PS-A-3b, `bfba61b1`, `probabilityGuidedLessons.ts`), every quoted number asserted against the readout; spec P2 acceptance 3 (limit statement, correction not optional at classroom n, Poisson regime n large and np moderate, rules of thumb labelled). Then `just smoke-lesson prob-binomial-normal`.
3. Poster capture for `prob-binomial-normal` (empty `POSTER_PENDING` of that id and its `DemonstrationsPage.test.tsx` exemption, rebuild, then capture; see handoff 28 notes) — can join a later joint capture.
4. Then P3 (CLT) per the probability README, and the `probability` chapter (F4).
5. Low priority, P2 visual notes from the smoke: board tick labels use decimal points in Slovenian (check whether shared with other graphs before fixing); the normal area's dashed outline is not visible though the legend says "dashed" (`signedFill(..., {dash: 2})` in `BinomialNormalGraph.tsx`); in the rare example the caption touches the normal peak. Older: shared function-inspector overflow at 200 % text, shared `PointListInput` overflow, handoff 24 item 4.

## Lessons for briefs

- Splitting a graph slice into graph+localization+Presets and then host tests kept both Sonnet workers far under budget (72k and 56k).
- Assertions of the handler's own premises in test briefs keep catching handler defects (the fitted view this session).
- Smoke workers still leave screenshots unopened; ask for a one-line description of each screenshot in the return table and open the visual ones yourself.
- After each rebase, check `git diff --stat <old> origin/master` against the slice's shared files, then rerun the count tests and localization.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-29.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
