# Functions stream: handler handoff 25

Handler 25 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-03 after its 175k soft threshold. Stream file: `docs/tasks/feature-streams/functions.md`. Worktree `.claude/worktrees/stream-functions`, branch `stream-functions`.

## Done this session (school-function-graphs 06, Batch B)

- F2a-1 S3 `PolynomialZerosGraph` with the shared `zeroListModel.ts` / `ZeroListEditor.tsx` / `zeroListMessages.ts` (`57b30256`, on master).
- F2a-2 S4 `RationalFunctionGraph` and the zero-drag bench `just school-function-drag-bench` with an ADR 0026 addendum (median ≤ 0.16 ms, p95 ≤ 0.34 ms; 600 samples stand) (`ed2d95b0`, on master).
- F2b routes `/bezeg-2.0/functions/polynomial-zeros` and `/bezeg-2.0/functions/rational-functions`, `lesson: false`, posters pending; headless frame runs held 60 Hz (`scripts/function-browser-perf.cjs`) (`b5cad33f`, on master).
- F3 + F4 Part A (lesson S3 and chapter section `polynomial-zeros`): written in a WIP commit on the branch `stream-functions` only (see the commit after this note's parent; `git log origin/stream-functions -3`). **Not on master**: `guidedExamplePreviews.test.ts` fails until the F5 card exists, and the mutation checks are not done. `just typecheck` passed; the full scoped unit run had 6 failures, 5 fixed by test-expectation updates (listed in `worker-school-06-f3-a-handoff.md`), the sixth is the expected card failure. The status of the re-run is recorded in the WIP commit message.

## Next, in order

1. Finish Part A: read `docs/reviews/feature-streams/functions/worker-school-06-f3-a-handoff.md` and the WIP commit; rerun `just unit src/learning src/graphs/functions src/localization src/demonstrations.test.ts` (`BEZEG_MEMORY_FLOOR_GB=0.5`); run the mutations (scene state, quoted \(p(0)=2\), parity); read the SL/EN lesson prose yourself (no worker has); review `LearningPage.test.tsx`'s new `sectionsSl` plural helper.
2. Part B (lesson S4 + its section): brief `briefs/school-06-f3f4.md` Part B; add the lesson to `schoolFunctionGraphsBatchBGuidedLessons.ts`. Plan for two workers (each lesson slice needed a handoff at 135k this session).
3. F5 cards for both lessons (precedent `bc786aad`, brief `briefs/numerical-06-f5.md`), which turns `guidedExamplePreviews.test.ts` green; then push F3–F5 to master.
4. F6 gate: `just check`, `just smoke-lesson polynomial-zeros rational-function …`, browser smoke SL/EN with a live switch, plus the frame cases F2b left open (language switch, denominator drag over poles on `double-pole`, `k` and probe sliders, touch), CI.
5. Then `fourier-series/05`, then numerical N5 (check `docs/tasks/numerical-methods/README.md`).

## Open risks and deferred findings

- Lesson slices here run long (53 turns to 135k for Part A); keep briefs per lesson.
- The Bash tool halves backslashes in heredocs: edit lesson text with the Edit tool; for Python, build backslashes with `chr(92)`.
- Rebase conflicts on shared lists (`PresetCatalog.test.tsx` `PENDING_ROUTE_KEYS`, `lessonMathNotation.test.ts`, `lessonCatalog.test.ts`, smoke spec): union both sides, recheck count tests.
- Low, carried from handoff 24: K4 pencil status line, five-point off-grid silent revert, card capture stretch about 1.4×.
- `preset.png` deleted (unclaimed).

## Settings to keep

Handler `--agent claude --model opus --permission-mode auto --effort medium`; self-watch `--until 175000` (owner override), successor launch at 215k or right after closing out at the soft threshold, and pass this rule on. Workers `bezeg-worker` Sonnet `medium`, 135k watcher each; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Sonnet `medium`. Ports 4315 (smoke/perf) and 4320 (`just smoke-lesson`). Briefs this session: `briefs/school-06-f2a-poly.md`, `-poly-resume.md`, `-rational.md`, `-rational-resume.md`, `-measure.md`, `-f2b.md`, `-f3f4.md`, `-f3-a-resume.md`. Worker logs under `C:/Users/1337Hacker/.claude/jobs/dae24822/tmp/s06/` (not durable).
