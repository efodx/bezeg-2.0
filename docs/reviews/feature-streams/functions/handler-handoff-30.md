# Functions stream: handler handoff 30

Handler 30 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-03 at its 175k soft threshold. Stream file: `docs/tasks/feature-streams/functions.md`. Worktree `.claude/worktrees/stream-functions`, branch `stream-functions` (`origin/stream-functions` has diverged, never force-push it).

## Done this session

Rebased onto `origin/master` `3f33ce7f` and pushed to master (see the commit list in the final report / `git log origin/master`):

- **F3 accepted** (`03370701` on top of the rebased WIP `3843d46c`): the four math-review prose repairs (SL/EN). The "harmonic 1 before K" guard was redundant (`prepared-scene` `demonstration-default` resets the model, `BaseGraph.tsx:471`), so it was removed and a test applies a scene with K = 3 after k = 16.
- **F4 accepted** (`546dbbbe`): section `fourier-coefficients` of the `fourier-series` chapter; owner moved; out of `CHAPTER_LINK_PENDING`. Root cause found while smoking F3: a chapter-owned chapter opens only the lesson its section owns (`guidedExamples.ts:254`), so the lesson could not open under the interim owner `fourier-idea`. Handler repair: decay theorem hypothesis \(f^{(m)}\) piecewise \(C^1\) (the worker wrote "piecewise continuous", too weak), `c_k` defined, SL "pojemanje" not "razpad".
- **F5 accepted** (`c35fdca7`): example card `fourier-series.fourier-coefficients.fourier-coefficients` (generator `fourierCoefficientsExpectedFor`, capture route widened, SL/EN copy, full capture run). Handler fixed the alt (harmonic is dotted, f is solid).
- Records: `05-batch-b.md` F3/F4/F5, stream row, `docs/tasks/fourier-series/README.md` row.
- Rebase conflicts were mechanical: lesson/copy counts 99/106, `lessonMathNotation` list, `lessonCatalog.test.ts` no-lesson list now `[]`, smoke `LESSONS` gained `fourierCoefficients`, chapter references 113, `CHAPTER_LINK_PENDING` `['patch-coons']`.

Checks before the rebase: `just check` passed (879 s); `just smoke-lesson fourier-coefficients fourier-series` passed; node script tests 28/28. After the rebase: see the final report (`just check` and `just smoke-lesson fourier-coefficients fourier-series prob-correlation`).

## Next, in order

1. **Poster recipe repair** (from geometry handler 42, `docs/tasks/feature-streams/geometry.md`): the `fourier-coefficients` poster recipe window `[-7.2, 3.6, 7.2, -2]` cuts the product curve and shaded areas at the bottom; lower the bottom bound and recapture with `PREVIEW_RECAPTURE_IDS`. Same handler notes `rational-function`'s asymptote labels sit on the upper branch while its formula touches the curve; both recipes are ours.
2. **F6 batch gate** for task 05 (like task 04 F6): `just check`, `just smoke-lesson` for the Fourier lessons and neighbours, browser smoke SL/EN of `/analysis/fourier-coefficients` and the Learn chapter at 1920/390 px, hosted CI green after push; then mark Batch B released in `05-batch-b.md`, README and the stream row.
3. Then numerical methods N5.

## Open risks

- Vitest may not see newly added PNGs through a stale transform cache; the F5 worker cleared `node_modules/.vite/vitest` and `node_modules/.vitest-cache`.
- Heredocs in the Bash tool halve `\`: edit LaTeX with the Edit tool. Rebase conflict files use CRLF: conflict regexes need `\r?\n`.
- Count tables (`guidedExamplePreviewCopy.test.ts`, `authoredChapterCoverage.test.ts`, `lessonCatalog.test.ts`, `Routes.test.tsx`, `demonstrations.test.ts`) auto-merge or conflict on every rebase; recheck them.
- Open deviation (owner): decay spectra stacked in the inspector, not side by side.

## Settings to keep

Handler `--agent claude --model opus --permission-mode auto --effort medium`; self-watch `--until 175000` (owner override), launch the successor at 215k or right after closing out at the soft threshold, and pass this rule on. Workers `bezeg-worker` Sonnet `medium`, 135k watcher each; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Sonnet `medium`. Ports 4315 (preview/capture) and 4320 (`just smoke-lesson`).
