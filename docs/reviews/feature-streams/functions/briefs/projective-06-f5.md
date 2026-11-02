# Brief handoff-v13: projective conics 06 F5 (chapter cards)

- **Role:** implementation; edit permission in the stream worktree `.claude/worktrees/stream-functions`. Do not commit, push or delegate. Preserve the untracked files under `docs/reviews/feature-streams/functions/`.
- **Source:** F5 in `docs/tasks/projective-conics/06-batch-a-release.md`. Catalog posters for the three projective Demonstrations already exist (they are not in `src/demonstrationPosterPending.ts`), so this slice is only the chapter cards of the new chapter `projective-conics` (F4, `src/learning/content/projectiveConicsChapter*.ts`). Highlight recipes are not supported for chapter-owned chapters (`scripts/generate-guided-example-inventory.cjs` asserts this), so every card is `{kind: 'start'}`: the first frame of the lesson. Do not touch the poster capture, `POSTER_PENDING` or `scripts/demonstration-preview-recipes.cjs` (other streams run a joint poster capture there).
- **Pattern to copy:** the Fourier/numerical/school cards commit (find it with `git log --oneline -S "fourierPreviewCopy" -- src scripts`, then `git show <hash> -- <path>` file by file), and `git show 2c800426` for the table-driven mode. `docs/commands.md` (search `--chapter`) describes the mode.

## Cards

Three example ids `projective-conics.<sectionId>.<demonstrationId>`: `projective-cross-ratio`, `projective-pascal`, `projective-pole-polar` (confirm from `projectiveConicsChapterRegistry.ts` and `authoredChapterCoverage.test.ts`).

- `scripts/generate-guided-example-inventory.cjs`: one `chapterInventories` entry with an authored `projectiveConicsExpectedFor(id, step)`, exported like the others. Derive `types`, `curveCount` and `points` from each lesson's first step scene and actions (`src/learning/content/projectiveConicsGuidedLessons.ts`) and from what each graph class draws when visible (`src/graphs/projective/`). Compute point coordinates from the scene's numbers (K1: A,B,C,D at 0,1,3,4 with centre O; K2: the six ellipse points; K3: P=(1,21/5) and the tangency points), never from a capture. A missing or empty expectation must fail. Default output: `docs/reviews/projective-conics/guided-example-inventory.json`.
- `scripts/capture-guided-example-previews.cjs`: one `chapterFamilies` entry whose route regex accepts exactly the three `/bezeg-2.0/projective/...` lesson routes (confirm against `src/demonstrations.ts`) and nothing else. Keep the existing modes unchanged.
- Copy: `src/learning/content/projectiveConicsPreviewCopy.ts`, keyed by example id like the Fourier copy, registered in `CHAPTER_GUIDED_EXAMPLE_PREVIEWS` (`src/learning/chapter/guidedExamplePreviews.ts`). Start from the existing preview copy for the three lessons in `guidedExamplePreviewCopy.ts` if present. Each caption states what the first frame shows; check it against the captured PNG. Slovenian default with English in lockstep; reuse the chapter's terms. Math in `\(...\)` with doubled backslashes (use the Edit tool, not shell heredocs); `{,}` decimals in SL. `alt` text is plain text, no LaTeX.
- Tests: extend `scripts/generate-guided-example-inventory.test.cjs`, `scripts/capture-guided-example-previews.test.cjs` and `src/learning/chapter/guidedExamplePreviews.test.ts` as the pattern commit did.
- `docs/commands.md`: add `projective-conics` to the listed `--chapter`/`--family` values.

Do not touch other chapters' images or entries, the retained manifest or root-level example PNGs. Other streams may add their own `chapterInventories` entries concurrently.

## Checks

- `node --test` on each touched `scripts/*.test.cjs`. For each new assertion, report an observed failure under a deliberate mutation (wrong route accepted, empty expectation).
- `npx tsc --noEmit --pretty false`; `npx eslint` on touched files.
- `BEZEG_MEMORY_FLOOR_GB=0.5 just unit` on the touched test files plus `src/learning/content/lessonMathNotation.test.ts`. Not the full suite. Never bare `npx vitest`.
- Generate the inventory. Captures: check free memory first (PowerShell `(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory`); go ahead at ≥ 3 GB. The handler has a fresh `just build` in the worktree; run `just preview 4315` in the background, capture with `PREVIEW_BASE_URL` on port 4315 and `--family projective-conics`, and stop the preview afterwards. If memory stays low, finish everything else, skip captures and say so.
- Read every new PNG (three cards) and report what each shows, whether anything is cropped, blank or overlapping, and whether the caption matches it.

## Return

≤ 250 words: files changed, check results with log paths, mutation evidence, the authored expectations per card with how each number was derived, what each PNG shows, deviations as `file:line`. Logs go to `C:/Users/NonFriedMotherBoard/.claude/jobs/8eb025d4/tmp/f5/`, never `docs/`.

Budget: locate with `grep -l`/`-c` before reading; read ≤ 150 lines per call; send test, build and capture output to log files. On a `HANDOFF` message, or after about 30 turns before acceptance, stop at a consistent point, write state, remaining steps, touched files and checks to `docs/reviews/feature-streams/functions/worker-projective-f5-handoff.md`, and return as partial.
