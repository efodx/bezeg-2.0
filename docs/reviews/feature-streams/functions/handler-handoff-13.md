# Functions stream: handler handoff 13

Handler 13 (Opus 5.5, `--permission-mode auto`, `--effort medium`, relaunched by the supervisor after a crash) wrote this note on 2026-11-02 at the 150k soft threshold. `G-FN`, `G-REG` and now `G-HL` are open. `Run state: active`.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`. The `node_modules` junction points to the main install; delete it before removing the worktree.
- **Pushed to `master` this session** (each rebased onto `origin/master` and rechecked: typecheck, focused unit set, build, `smoke-lesson` rows; lesson rows walk SL and EN):
  - `fd2a176a` F2b registration (transformation, inverse, Fourier routes) and handoff 12.
  - `df67c48e` numerical 05 F3a: lessons N1+N2 as one 13-step `root-finding` lesson (`numericalMethodsGuidedLessons.ts`).
  - `c8b27a2a` school 05 F3: lessons S1, S2 (`schoolFunctionGraphsGuidedLessons.ts`, seven steps each).
  - `8c55dc1a` Fourier 04 F3: lessons F1+F3 as one 13-step `fourier-series` lesson (`fourierSeriesGuidedLessons.ts`).
  - Numerical 05 F3b: lesson N3 appended as steps 14–20 of `root-finding` (this push; secant 4/3, flat secant at ±1, exact root −1 checked in the handler).
- **Handler review:** each lesson's scene test mounts the real graph and applies every scene out of order and twice in one synchronous sequence; quoted numbers were recomputed in the handler (Newton 12,2 and −1 cases; S1 images, S2 slopes 5,5452/0,18034; Gibbs peaks 1,18130 at π/12, 1,17901 at N = 101, limit 1,17898). Deviations are recorded in each family's task file.
- **Rebase pattern:** every push this session met mechanical conflicts in the shared lesson lists (`guidedLessons.ts` Map line, `lessonMathNotation.test.ts` id list, `guidedExamplePreviewCopy.test.ts` counts, `lessonCatalog.test.ts` no-lesson list, `tests/guided-lessons.smoke.spec.cjs` `LESSONS`). Keep both sides. **Counts merge silently when both sides make the same +1 edit:** recompute them (72/79 at `8c55dc1a`).
- **Memory:** Claude Code reaped background commands once under critical pressure; long checks were then run in the foreground (each step under 10 minutes). One worker at a time.
- **Untracked:** `briefs/` and `worker-school-f3-handoff.md` in this folder (handler records, not committed).

## Next, in order

1. **F4 chapters** (one slice each; `G-HL` is open, so chapters may not contain `figure` items and examples author highlight recipes per [guided example highlights](../../../specs/guided-example-highlights.md)): numerical *Numerične metode na grafu*, school *Grafi funkcij za maturo*, Fourier *Fourierove vrste*. Model on a recent family chapter commit (e.g. triangle geometry `96c0b2c9`, triangulations `8f4118d3`).
2. **F5 media** per family (preview clip, card images, highlight recipes), only while no other worker runs; regenerate the manifest with its script after rebasing.
3. **F6 gates** per family: `just check`, smoke of the family routes in SL and EN with a live switch, hosted CI.
4. **Projective 06 F3–F6.**

## Deferred items (low)

- Fourier: scenes cannot zoom (no zoom action), so steps 8–9 ask the student to press the zoom button; the uniform-convergence link is a prerequisite line plus a `sources` entry (lesson content has no link item).
- Lesson workers on these files reached the 135k budget at ~50 turns mostly by reading; briefs now cap reads at 100 lines and name template files.
- Handoff 12's deferred items still stand.

## Settings to keep

Successor `--agent claude --model opus --permission-mode auto --effort medium`. Workers `bezeg-worker` Sonnet `medium`; smoke `bezeg-smoke`; port 4315. Heavy checks with `BEZEG_MEMORY_FLOOR_GB=0.5`. Never force-push the stream branch (refused by the classifier and AGENTS.md); push only `HEAD:master`.
