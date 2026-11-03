# Functions stream: handler handoff 27

Handler 27 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-03 at its 175k soft threshold. Stream file: `docs/tasks/feature-streams/functions.md`. Worktree `.claude/worktrees/stream-functions`, branch `stream-functions` (rebased onto `origin/master`; `origin/stream-functions` has diverged, never force-push it).

## Done this session (school-function-graphs 06 F6)

- `just check` green at `82a35eec`. `just smoke-lesson polynomial-zeros rational-function` failed both S4 walks (probe point at \(x=10\) above the default box); fixed by a lesson view on the oblique scenes (`11926a7d`), then 4/4 passed.
- Browser smoke SL/EN (brief `briefs/school-06-f6-smoke.md`): checks 1–7 passed; check 8 found the S4 asymptote label hidden. Fixed placement by clipping the line to the inset view (`0aa19043`, host test fails on old code). Card recaptured, inventory refreshed, capture overlap guard given a horizontal tolerance near poles (`8601b0b2`, brief `briefs/school-06-f6-card.md`). Results recorded in `06-batch-b.md` F6 and the stream file (`0eb28935`). All on master at `0eb28935`.
- Checks after the last rebase: `just typecheck`, `guidedExamplePreviews.test.ts`, `RationalFunctionGraph.host.test.tsx`, `node --test scripts/capture-guided-example-previews.test.cjs` passed.

## Next, in order

1. **Hosted CI on `0eb28935`** (`gh run list --branch master`). Our earlier failure (`guidedExamplePreviews`) is fixed by `8601b0b2`. `GraphTransientState.part4` `prob-summary` ("a rollback within one tick leaves the board drawn…") failed first on master's `eed10ca6` (curves stream); not ours, report it if it persists. When our jobs are green, mark F6 accepted (Batch B released) in `06-batch-b.md` and the stream file.
2. **Fourier 05 F2a-1 resume.** Local commit `wip: Fourier coefficients model and projection view…` (top of `stream-functions`, also pushed to `origin/stream-functions-h27`; not on master). Brief `briefs/fourier-05-f2a-1.md`, worker note `worker-fourier-05-f2a-1-handoff.md`. The code typechecks but is unmounted and untested. Remaining: eslint, model tests with the brief's exact values, host test, ≥3 mutations, terms rows in `docs/localization.md` (worker chose *spekter koeficientov*, *Parsevalova vsota*, *povprečje kvadrata*; research them per localization.md). Handler decisions on the worker's questions: plot \(a_0/2\) (the constant term), not \(a_0\); flat slot-indexed handle values, strict parse, K below the selected harmonic rejected and layout choice resetting values are accepted. Start a fresh resume worker (the first one hit 135k after 32 turns: keep the resume brief narrow, e.g. tests + mutations only, a second worker for lint/terms if needed).
3. Then F2a-2 (decay view: side-by-side spectra, lin/log, reference curves, zero bars, "log 0 is not drawn", \(N\), sup error) and the drag measurement (\(K=16\) with overlay, per the performance plan), then F2b–F6 like task 04. Then numerical N5 (`docs/tasks/numerical-methods/README.md`).

## Open risks

- Low, from F6: the S4 card's `y = x + 2` label touches the upper branch; the probe's \(r/q\) label can overflow the right board edge on `double-pole` and sits off-board when the probe is off-view.
- Posters for `polynomial-zeros` and `rational-function` stay in `POSTER_PENDING` for the owner's cross-stream recapture (as `fe8be6b0` did).
- Vitest fs cache after adding PNGs: `npx vitest --clearCache`. The Bash tool halves backslashes in heredocs: edit lesson text with the Edit tool. Rebase conflicts on shared lists (e.g. `FUNCTION_VISIBILITY_TARGETS` in `src/learning/model.ts` this session): keep both sides.
- Keeping WIP local while pushing finished work: commit finished work before the `wip:` commit (reset `--mixed HEAD~1`, commit, recommit wip) and push `<sha>:master`.

## Settings to keep

Handler `--agent claude --model opus --permission-mode auto --effort medium`; self-watch `--until 175000` (owner override), successor launch at 215k or right after closing out at the soft threshold, and pass this rule on. Workers `bezeg-worker` Sonnet `medium`, 135k watcher each; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Sonnet `medium`. Ports 4315 (preview/smoke; `just preview 4315`, no `--strictPort`) and 4320 (`just smoke-lesson`).
