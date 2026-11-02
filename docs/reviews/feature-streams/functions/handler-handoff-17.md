# Functions stream: handler handoff 17

Handler 17 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-02 at the 150k soft threshold. `G-FN`, `G-REG` and `G-HL` are open. `Run state: active`.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`. Local HEAD is the F3c WIP commit (`wip: projective K3 …`, unverified) on top of this note's commit on `origin/master`; the WIP is also pushed to `origin/stream-functions-f3c-wip`. Do not push the WIP to `master` until it passes the checks below. `origin/worktree-stream-functions` has old, diverged history: never push there. The `node_modules` junction points to the main install; delete it before removing the worktree.
- **Pushed to `master` this session:**
  - `f3663a44` F6 accepted for numerical methods, school function graphs and Fourier (hosted CI green on `25bee242`, run 41409986502). Batch A of the three families is released.
  - `553e4d24` + `74c7419b` projective 06 F3b: K2 Pascal lesson, `pascal-*` operations on `PascalGraph`. Checks on rebased `74c7419b`: typecheck, `just unit src/learning src/graphs/projective src/demonstrations.test.ts src/Routes.test.tsx`, build, `just smoke-lesson projective-pascal projective-cross-ratio`, lint on touched files. Mutations: 5 of 5 observed (one only after the handler added the per-field quoted-point test). Engineering review (Sonnet): no blocking findings; two vacuous host-test cases repaired and confirmed failing under no-op mutations.

## Next, in order

1. **Finish F3c (K3 pole/polar)** from `worker-projective-f3c-handoff.md` (brief `briefs/projective-06-f3c.md`). Done: four `pole-polar-*` operations (`model.ts`, `PolePolarGraph.tsx`), passing host test `PolePolarLessonActions.host.test.tsx`, seven scenes, registration (preview counts 77/84). Open: `projectivePoleLesson.test.ts` has 3 failing tests from one cause, the graph names the tangency points in the reverse of the spec (default: graph \(T_1=(-3,12/5)\), \(T_2=(4,9/5)\); spec `projective-conics-lessons.md:100` the other way), and the infinity polar reads `x = 0`. Decide: align prose and the test's SCENES to the graph's order (cheapest), or reorder in the graph; record the deviation. Remove the temporary DBG test at the end of the lesson test. Then typecheck, lint, the broad unit set, the worker's mutation list (in its note), a per-field quoted-point check like K2's, build, `just smoke-lesson projective-pole-polar`, engineering review, record acceptance in `06-batch-a-release.md`, the projective README and the stream table, commit (a new non-WIP commit), rebase onto `origin/master` and push `HEAD:master`.
2. F4 chapter *Projektivna geometrija stožnic* (moves the interim owner `rational-curves`/`worked-conic` of K1–K3), then F5 cards (chapter-owned mode), then F6.

## Deferred items (low)

- Handoff 16's items still stand (Learn card `alt` text with raw LaTeX, root-finding Method switch on the default scene, Fourier \(S_1\) sampling and zoom, the uniform-convergence link).
- Older untracked briefs and worker notes from handlers 13–15 remain untracked under `docs/reviews/feature-streams/functions/`; leave them.

## Settings to keep

Successor `--agent claude --model opus --permission-mode auto --effort medium`. Workers `bezeg-worker` Sonnet `medium`: both K2 and K3 workers hit 135k (60 and 37 turns); the remaining F3c work is small enough for the handler, or brief one worker for the fixes only. Reviews `bezeg-reviewer` Sonnet. Logs in the current job's tmp folder. Heavy checks with `BEZEG_MEMORY_FLOOR_GB=0.5`; the broad unit set takes about 11 minutes, so run it in the background. Never force-push; push only `HEAD:master`, rechecking after the rebase.
