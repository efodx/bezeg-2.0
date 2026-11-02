# Functions F5: chapter-owned example cards for numerical, school and Fourier (brief handoff-v12, handler 15)

- **Role:** implementation, edit permission. Worktree `.claude/worktrees/stream-functions`, branch `worktree-stream-functions` (at `6602f5e8` on `origin/master`). Do not commit or push. Preserve the untracked files under `docs/reviews/feature-streams/functions/`.
- **Source:** F5 in `docs/tasks/numerical-methods/05-batch-a-lessons.md`, `docs/tasks/school-function-graphs/05-batch-a.md` and `docs/tasks/fourier-series/04-batch-a-release.md`. Catalog posters for these Demonstrations already exist (`POSTER_PENDING` is empty), so this slice is only the chapter cards. Highlight recipes are not supported for chapter-owned chapters (`scripts/generate-guided-example-inventory.cjs:288` asserts this), so every card is `{kind: 'start'}`: the first frame of the lesson.
- **Pattern to copy:** `git show 2c800426` (linear maps, made the mode table-driven) and `git show dd2cfc08` Part A only (complex maps). `docs/commands.md:50` describes the mode.

## Cards

Chapters `numerical-methods`, `school-function-graphs`, `fourier-series`. Their registries are `numericalChapterRegistry.ts`, `schoolFunctionGraphsChapterRegistry.ts`, `fourierChapterRegistry.ts` in `src/learning/content/` (lazy getters over the catalog lessons). Expect four ids of the form `<chapterId>.<sectionId>.<demonstrationId>` (root-finding; function-transformation; function-inverse; fourier-series); confirm them from the registries and `src/learning/chapter/authoredChapterCoverage.test.ts`.

- `scripts/generate-guided-example-inventory.cjs`: one `chapterInventories` entry per chapter with an authored `<name>ExpectedFor(id, step)`, exported like `complexMapsExpectedFor`. Derive `types`, `curveCount` and `points` from each lesson's first step scene and actions (the guided lesson files `numericalMethodsGuidedLessons.ts`, `schoolFunctionGraphsGuidedLessons.ts` and the Fourier lesson file) and from what each graph class draws when visible. Compute point coordinates from the scene's numbers (a root-finding start value, a transformed vertex, a reflected point, a partial-sum value), never from a capture. A missing or empty expectation must fail. Default outputs: `docs/reviews/<chapterId>/guided-example-inventory.json`.
- `scripts/capture-guided-example-previews.cjs`: one `chapterFamilies` entry per chapter whose route regex accepts exactly that chapter's lesson routes (`/bezeg-2.0/analysis/root-finding`; `/bezeg-2.0/functions/transformations` and `/bezeg-2.0/functions/inverse`; `/bezeg-2.0/analysis/fourier-series` — confirm against the registry path functions) and nothing else. Keep the existing modes unchanged.
- Copy: one `src/learning/content/<name>PreviewCopy.ts` per chapter, keyed by example id as `complexMapsPreviewCopy.ts`, registered in `CHAPTER_GUIDED_EXAMPLE_PREVIEWS` (`src/learning/chapter/guidedExamplePreviews.ts`). If `guidedExamplePreviewCopy.ts` or git history (`git log -S "function-transformation" -- src/learning`) has copy for the old interim ids, start from it. Each caption states what the first frame shows; check it against the captured PNG. Slovenian default with English in lockstep; reuse each chapter's terms (read its chapter file). Math in `\(...\)` with doubled backslashes; `{,}` decimals in SL, `.` in EN.
- Tests: extend `scripts/generate-guided-example-inventory.test.cjs`, `scripts/capture-guided-example-previews.test.cjs` and `src/learning/chapter/guidedExamplePreviews.test.ts` as the two model commits did.
- `docs/commands.md:50`: add the three chapter ids to the listed `--chapter`/`--family` values.

Do not touch other chapters' images, the retained manifest, root-level example PNGs or other streams' entries. The Geometry stream may add its own `chapterInventories` entries to `master` concurrently; that is fine.

## Checks

- `node --test` on each touched `scripts/*.test.cjs`. For each new assertion, report an observed failure under a deliberate mutation (for example, wrong route accepted, empty expectation).
- `npx tsc --noEmit --pretty false`; `npx eslint` on touched files.
- `just unit` on the touched test files plus `src/learning/content/lessonMathNotation.test.ts`. Do not run the full suite.
- Generate the three inventories. Captures: check free memory first (`Get-CimInstance Win32_OperatingSystem` FreePhysicalMemory); go ahead at ≥ 3 GB, with `BEZEG_MEMORY_FLOOR_GB=0.5` for `just` heavy commands. Then `just build`, `just preview 4315` in the background, capture each chapter with `PREVIEW_BASE_URL` on port 4315 and `--family <chapterId>`, and stop the preview afterwards. If memory stays low, finish everything else, skip captures and say so.
- Read every new PNG (four cards) and report what each shows, whether anything is cropped, blank or overlapping, and whether the caption matches it.

## Return

≤ 300 words: files changed, check results with log paths, mutation evidence, the authored expectations per card with how each number was derived, what each PNG shows, decisions and risks as `file:line`. Logs go to `C:/Users/NonFriedMotherBoard/.claude/jobs/8ac03473/tmp/f5/`, never `docs/`.

Budget: locate with `grep -l`/`-c` before reading; read ≤ 150 lines per call; send test, build and capture output to log files. On a `HANDOFF` message, or after about 30 turns before acceptance, stop at a consistent point, write state, remaining steps, touched files and checks to `docs/reviews/feature-streams/functions/worker-f5-notes.md`, and return as partial.
