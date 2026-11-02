# Functions stream: handler handoff 18

Handler 18 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-02 after the 150k soft threshold. `G-FN`, `G-REG` and `G-HL` are open. `Run state: active`.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`, rebased onto `origin/master` `005b2e7a` (L2 de Boor lesson). Local commits on top: `0171b952` (F3c WIP), `0234ce6f` (feat: finish K3), `5aac4d63` (docs: accept F3c), then this note's commit. Pushed to `origin/stream-functions-f3c` (new branch; `origin/stream-functions-f3c-wip` holds the pre-rebase WIP and is stale). **Not on `master` yet.** `origin/worktree-stream-functions` has old, diverged history: never push there. The `node_modules` junction points to the main install; delete it before removing the worktree.
- **F3c done and accepted on the pre-rebase revision** (see `docs/tasks/projective-conics/06-batch-a-release.md`, F3c entry): T1/T2 named in the graph's order (deviation from the spec recorded), infinity polar quoted as `x=0`, DBG test removed, a new per-field test of quoted region/residual values (mutation 5 survived without it). On `2c1f3b97`/`49b4c1ec` (rebased once onto `f71e610b`): typecheck, lint, `just unit src/learning src/graphs/projective src/demonstrations.test.ts src/Routes.test.tsx` (101 files, 1606 tests; run before the test-only `minus` removal), build, `just smoke-lesson projective-pole-polar` (2 rows), mutations 5/5; after the first rebase `just unit src/learning/content src/learning/runtime src/learning/chapter src/graphs/projective src/demonstrations.test.ts` (95 files, 1476 tests) and build. Engineering review (Sonnet): no blocking findings.
- **Second rebase onto `005b2e7a`** had mechanical conflicts, resolved by keeping both sides: `lessonMathNotation.test.ts` (both ids added), `tests/guided-lessons.smoke.spec.cjs` (both rows and both `LESSONS` entries), `lessonCatalog.test.ts` (the no-lesson list is now empty: each side removed its own last id; comment updated). Preview counts 77/84 checked against master's 76/83. On `5aac4d63`: typecheck and lint passed. **The unit set, build and smoke were stopped by the host for low memory and did not run.**

## Next, in order

1. Recheck `5aac4d63`+ (after fetching and, if `master` moved, rebasing again): `BEZEG_MEMORY_FLOOR_GB=0.5 just unit src/learning/content src/learning/runtime src/learning/chapter src/graphs/projective src/demonstrations.test.ts src/Routes.test.tsx` (about 9 minutes, run in the background), `just build`, `just smoke-lesson projective-pole-polar bspline-deboor projective-pascal`. If green, push `HEAD:master` (fast-forward only).
2. F4 chapter *Projektivna geometrija stožnic*: brief ready at `briefs/projective-06-f4.md` (chapter id `projective-conics`, plane-geometry strand after `triangle-geometry`, moves K1–K3 from `rational-curves`/`worked-conic`). Dispatch one `bezeg-worker` Sonnet `medium`; then review, mathematical check of the quoted numbers, accept, push.
3. F5 cards (chapter-owned mode), then F6 (`just check`, smoke in SL and EN with a live switch, CI).

## Deferred items (low)

- From the F3c review: `pole-polar-place` while P is at infinity is untested in the host test; the lesson test repeats the host test's refuse cases.
- Handoff 16's items still stand (Learn card `alt` text with raw LaTeX, root-finding Method switch on the default scene, Fourier \(S_1\) sampling and zoom, the uniform-convergence link).
- Older untracked briefs and worker notes from handlers 13–15 remain untracked under `docs/reviews/feature-streams/functions/`; leave them.

## Settings to keep

Successor `--agent claude --model opus --permission-mode auto --effort medium`. Workers `bezeg-worker` Sonnet `medium`. Reviews `bezeg-reviewer` Sonnet. Logs in the current job's tmp folder. Heavy checks with `BEZEG_MEMORY_FLOOR_GB=0.5`, one at a time: this session's background unit+build+smoke chain was reaped for low memory while other streams ran. Never force-push; push only `HEAD:master`, rechecking after each rebase.
