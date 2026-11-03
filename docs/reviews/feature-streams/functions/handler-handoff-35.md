# Functions stream: handler handoff 35

Handler 35 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-03 after its 175k soft threshold.

- Stream file: `docs/tasks/feature-streams/functions.md`.
- Worktree `.claude/worktrees/stream-functions`, branch `stream-functions`.
- `origin/stream-functions` has diverged, so never force-push it; push to `master` only, as a fast-forward.
- Task: `docs/tasks/school-function-graphs/07-batch-c.md`. It records every accepted slice below with its details, deviations and open nits.

## Done this session

- **CI for handoff 34's push:** green. Run 41655582206 on `f395ecde` (contains `75041d0c`) passed all jobs, including deploy.
- **07 F2a-2, S6 `ConicFocalGraph`:** commit `630087b5`. State is focus, ℓ and ε, with the directrix at ℓ/ε and the circle at ε = 0. It adds `matchedConicArc` and the bridge with weight and deviation. Engineering and math reviews found nothing blocking. `just check` passed. CI run 41665003344 on `e0911ca` (contains it) is green.
- **07 F2b, registration:** commit `2fedc180`.
  - Routes `/functions/geometric-series` and `/functions/conics` (id `conic-focal`).
  - Fixes: the conic Preset round-trip, and caption headroom (S5 0.8 of the span; S6 view top 20).
  - Browser frames: median 16.7 ms.
  - `just check` passed. The rebase conflicted on the count tests; I kept both sides (106 routes, B-splines 5, Functions 14).
- **07 F3/F4/F5 Part A, S5 lesson:** the eight-scene lesson `geometric-series`, its chapter section and card, plus the S4 card recapture after `da824fdc`. Review repairs applied. See the push state below.

## Push state at the time of writing

`just check` was running on the dirty S5 Part A tree on top of `86d61302`. If this note's commit is on master, the S5 commit (`feat: S5 geometric series lesson, section and card (school function graphs 07 F3-F5 Part A)`) precedes it and passed `just check`. If not, the successor must first check `git status`: run `just check`, commit the S5 files (task doc, lesson files, chapter, cards, inventory, scripts and tests), then rebase and push.

## Next, in order

1. Confirm hosted CI for the latest push (`just ci`).
2. **07 F3/F4 Part B: the S6 lesson** `conic-focal`, per `briefs/school-07-f3f4.md` Part B. Lesson actions do not exist yet; suggested names are in the brief. The section comes after `geometric-series`. Then capture the S6 card (F5), copying `briefs/school-07-f5a.md`. Its card test is red until the card exists, so do the lesson and card before pushing. Expect two workers for the lesson (each Part A worker handed off at 135k). Then a content/math review.
3. **F6, the Batch C gate:**
   - Verify the S6 bridge against the existing rational Bézier chapter.
   - `just check`, plus `just smoke-lesson geometric-series` and `conic-focal`.
   - A browser smoke (Sonnet `bezeg-smoke`) in SL/EN at 1920 and 390.
   - Language switch, touch, and the S6 ε slider through 1 and 0.
   - CI.
4. Fourier 06 Batch C (epicycles) starts with a measurement and an ADR (`docs/tasks/fourier-series/06-batch-c.md`).

## Open risks

- Count tables and pending lists conflict on almost every rebase. Resolve by keeping both sides, then rerun `Routes`, `demonstrations`, `familyChapters`, `lessonCatalog`, `authoredChapterCoverage`, `guidedExamplePreviewCopy` and `lessonMathNotation`.
- The S6 conic picture is small at the shared view top 20: the ellipse is about 170 px wide at 1280. Lesson scenes may set tighter views if the action set allows it; otherwise record this in F6.
- Open nit: the S5 explore-scene test does not compare first n = 8 with the model's tolerance status.
- From handoff 32: the owner deviation on the Fourier spectra layout. Card `alt` text keeps `\(...\)` delimiters (existing convention).
- After a new PNG, a stale `node_modules/.vitest-cache` can break `import.meta.glob` tests; delete that folder.

## Settings to keep

- Handler: `--agent claude --model opus --permission-mode auto --effort medium`. Self-watch `--until 175000` (owner override). At 215k, or right after closing out at the soft threshold, launch the successor with `claude --bg` and pass this rule on.
- Workers: `bezeg-worker`, Sonnet, `medium`, each with a 135k watcher. Reviews: `bezeg-reviewer`, Sonnet. Smoke: `bezeg-smoke`, Sonnet, `medium`.
- Ports: 4315 (preview/capture), 4320 (`just smoke-lesson`), 4330 (field perf harness). Logs: the job tmp dir.
