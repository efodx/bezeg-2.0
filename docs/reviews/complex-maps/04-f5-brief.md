# Complex maps 04 F5: example cards and posters (brief, handler 10)

- **Role:** implementation, edit permission. Worktree `.claude/worktrees/stream-maps`, branch `worktree-stream-maps` (at `caa51161` on `origin/master`). Do not commit or push.
- **Source:** `docs/tasks/complex-maps/04-batch-a-release.md` F5; `G-HL` is closed, so only `{kind: 'start'}` card recipes. Pattern to copy: linear maps 07 F5 (`git show 2c800426`, brief `docs/reviews/linear-maps/07-f5-example-cards-brief.md`), which made the chapter-owned card mode table-driven.

## Part A: example cards for the Complex maps chapter

Two cards: `complex-maps.reciprocal-inversion.complex-reciprocal` (M1) and `complex-maps.roots.complex-roots` (M2). Confirm the exact ids from `src/learning/content/complexMapsChapterRegistry.ts` and `authoredChapterCoverage.test.ts`.

- `scripts/generate-guided-example-inventory.cjs`: add a `complex-maps` entry to `chapterInventories` (registry `complexMapsGuidedExampleRegistry`, path `complexMapsGuidedExamplePath`) with an authored `complexMapsExpectedFor(id, step)`. Derive `types`, `curveCount` and `points` from each lesson's first scene (`complexMapsChapterLessons.ts`), the example models (`src/graphs/complex/complexReciprocalModel.ts`, `complexRootsModel.ts`) and what each graph draws when visible. Do not derive them from a capture. M2 step 1 hides roots, polygon and test point, so only w (and whatever else stays visible) counts. A missing or empty expectation must fail (`assertExpectation`). Default output: `docs/reviews/complex-maps/guided-example-inventory.json`.
- `scripts/capture-guided-example-previews.cjs`: add a `complex-maps` entry to `chapterFamilies` whose route regex accepts both `/bezeg-2.0/complex-reciprocal` and `/bezeg-2.0/complex-roots` and nothing else. Keep the patches and linear-maps modes unchanged.
- Copy: new `src/learning/content/complexMapsPreviewCopy.ts` keyed by example id (as `linearMapsPreviewCopy.ts`), registered in `CHAPTER_GUIDED_EXAMPLE_PREVIEWS` (`src/learning/chapter/guidedExamplePreviews.ts`). Start from the existing complex entries in `guidedExamplePreviewCopy.ts`, and check each caption against the card's actual first frame. Slovenian is the default, with English in lockstep; reuse the chapter's terms. Put math in `\(...\)` with doubled backslashes, use `{,}` decimals in SL and points in EN.
- Tests: extend `scripts/generate-guided-example-inventory.test.cjs`, `scripts/capture-guided-example-previews.test.cjs` and `src/learning/chapter/guidedExamplePreviews.test.ts` as linear did.

## Part B: posters for `complex-reciprocal`, `complex-roots` and `linear-map`

- `node --test scripts/demonstration-preview-capture.test.cjs` currently fails only because `complex-reciprocal` and `complex-roots` have no recipe. Add both to `scripts/demonstration-preview-recipes.cjs` (shape: the `linear-map` entry around line 60, plus any per-id validation like line 269). Each needs a descriptive caption, the example control that sets a representative default (reciprocal: an example showing z, 1/z and the unit circle; roots: `w=2i, n=3` with roots and polygon visible if the controls allow), and a framing window that contains every visible object.
- Capture with `PREVIEW_RECAPTURE_IDS=linear-map,complex-reciprocal,complex-roots`, following `docs/commands.md` lines 30-36. Then remove the three ids from `POSTER_PENDING` (`src/demonstrationPreviewAssets.test.ts:6`) and from the exemption in `src/DemonstrationsPage.test.tsx:45`. Update any Learn thumbnail count that changes because `linear-maps` and `complex-maps` now get thumbnails (`src/learning/LearningPage.test.tsx`, the line with `.learning-thumb img`). Leave the other streams' ids in those lists.

## Copy rules and scope

- Do not touch other chapters' images, the retained manifest or root-level example PNGs, or other streams' recipes and exemptions. Other streams commit to `master` concurrently; preserve unrelated changes.
- `docs/commands.md`: one clause noting `complex-maps` as a supported `--chapter`/`--family` value if the paragraph lists them.

## Checks

- `node --test` on every touched `scripts/*.test.cjs`, including `scripts/demonstration-preview-capture.test.cjs` (must be fully green). For each new assertion, report an observed failure under a deliberate mutation.
- `npx tsc --noEmit --pretty false`; `npx eslint` on touched files.
- `npx vitest run` on the touched test files plus `src/learning/content/lessonMathNotation.test.ts` and `src/demonstrationPreviewAssets.test.ts`. Do not run the full suite; `just` heavy commands wait on a shared test slot.
- Captures: check free memory first (`Get-CimInstance Win32_OperatingSystem`, FreePhysicalMemory); go ahead only at ≥ 3 GB. Then `just build`, `just preview 4316` in the background, and captures with `PREVIEW_BASE_URL` on port 4316. Stop the preview afterwards. If memory stays low, finish everything else, skip the captures and say so.
- Read every new PNG (2 cards, 3 posters) and report what each shows, and whether anything is cropped or overlaps.

## Return

≤ 300 words: files changed, check results with log paths, mutation evidence, what each PNG shows, decisions and risks, flagged as `file:line`. Put long logs under `.command-logs/h10-f5/` and notes in `docs/reviews/complex-maps/04-f5-worker-notes.md`.

Budget: locate with `grep -l`/`-c` before reading; read ≤ 150 lines per call; send test and build output to log files. On a `HANDOFF` message, or after about 35 turns before acceptance, stop at a consistent point. Write the state, remaining steps, touched files and checks to `docs/reviews/complex-maps/04-f5-worker-notes.md`, and return as partial.
