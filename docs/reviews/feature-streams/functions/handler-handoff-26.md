# Functions stream: handler handoff 26

Handler 26 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-03 after its 175k soft threshold. Stream file: `docs/tasks/feature-streams/functions.md`. Worktree `.claude/worktrees/stream-functions`, branch `stream-functions` (rebased onto `origin/master` and pushed to `master`; `origin/stream-functions` has diverged, never force-push it).

## Done this session (school-function-graphs 06, F3–F5 on master)

- F3/F4 Part A, lesson S3 `polynomial-zeros` and its chapter section (`252ec06e`), with the handler prose read: the parity of the degree and the sign of k (not "the degree's sign") decide the ends; the explore step tries the refused merge first; SL grammar (`4e3fd56c`). Mutations: state, prose, table parity caught.
- F3/F4 Part B, lesson S4 `rational-function` and its section `rational-function` (`58cd44eb`). Accepted deviation: step 2 drags the pole onto the numerator zero 1 (spec hole \((1,2)\)); step 7 shows zero-onto-pole (hole \((2,1)\)). Handler prose fixes: probe slider within \([-10,10]\), no "zero" at a hole, SL wording. Mutations: state, prose, numbers, acceptance 5 caught.
- F5 cards for both sections (`f2ecb13c`); S4 card copy describes the frame (the probe is off-frame).
- Checks after the final rebase onto master `2bc90e9c`: `just typecheck`, both `node --test` scripts and `just unit src/learning src/graphs/functions src/localization src/demonstrations.test.ts src/presets` passed (first rebase), then typecheck and the conflicted-file tests passed again; logs under `C:/Users/1337Hacker/.claude/jobs/0afb8234/tmp/s06/` (not durable).

## Next, in order

1. F6 gate (`docs/tasks/school-function-graphs/06-batch-b.md` F6): `just check`; `just smoke-lesson polynomial-zeros rational-function` (port 4320); browser smoke SL/EN with a live language switch on both routes, plus the frame cases F2b left open (language switch, denominator drag over poles on `double-pole`, `k` and probe sliders, touch); CI after push. Check the S4 oblique-asymptote label: on the card it sits at the left edge and is clipped (graph label placement; low).
2. Posters for both routes are still pending (`POSTER_PENDING`), if F6 or the spec requires them.
3. Then `fourier-series/05`, then numerical N5 (check `docs/tasks/numerical-methods/README.md`).

## Open risks

- Vitest fs module cache (`node_modules/.vitest-cache`, this worktree's own directory) keeps old `import.meta.glob` results: after adding PNGs, run `npx vitest --clearCache` (docs/commands.md:18). It cost a worker several runs this session.
- Rebase conflicts on shared lists and counts (`authoredChapterCoverage`, `guidedExamplePreviewCopy`, `lessonMathNotation`, `lessonCatalog`, `familyChapters`, smoke `LESSONS`): union both sides, add your delta to master's count. A resolver sketch is in the job tmp dir (not durable).
- The Bash tool halves backslashes in heredocs: edit lesson text with the Edit tool.
- Low, carried: K4 pencil status line, five-point off-grid silent revert, card capture stretch about 1.4×; `preset.png` unclaimed.

## Settings to keep

Handler `--agent claude --model opus --permission-mode auto --effort medium`; self-watch `--until 175000` (owner override), successor launch at 215k or right after closing out at the soft threshold, and pass this rule on. Workers `bezeg-worker` Sonnet `medium`, 135k watcher each (lesson slices hit it: plan a resume worker per lesson); reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Sonnet `medium`. Ports 4315 (smoke/perf) and 4320 (`just smoke-lesson`). Briefs this session: `briefs/school-06-f3-b.md`, `-f3-b-resume.md`, `-f5.md`.
