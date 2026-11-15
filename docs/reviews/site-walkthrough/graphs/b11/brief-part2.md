# B11 part 2 brief (handoff-v13): review the recaptured chapter images and their alt text (G02)

**Role.** `bezeg-worker`, Sonnet. Edit only the owned paths. No git commands that move HEAD or change the index (`git show`, `git diff`, `git status` are fine), no commits, never push. Scratch in `.command-logs/`, never `/tmp`. Do not build, do not run any capture script, and do not stop or restart the preview on port 4333.

**Context.** The handler recaptured every chapter's stored guided example images (`src/images/learning/examples/<chapter>/`, uncommitted in the working tree) on the current build, after batches B1–B10 changed graph colours, typography and board text. Two rules now show on the cards:
- Palette: moss primary curve, blue second role, ochre points with a light outline, rust red (`GraphPalette.emphasis`) for one accent; board text in Literata.
- Capture-text rule (spec `docs/specs/site-walkthrough-graphs-and-captures.md`, C1; table `captureText` in `scripts/demonstration-preview-recipes.cjs`): a Demonstration listed there shows only the board text its `keep` patterns match. Example: the probability density card keeps only the line `X ∼ N(0, 1)`, so the readout "ploščina … 99,99 %" is gone from the image.

**Goal.**
1. Review: for each chapter with changed PNGs (`git status --short src/images/learning/examples/`), read at least two changed images with the Read tool (every image of `curve-geometry`). Compare each with its previous version (`git show HEAD:<path> > .command-logs/b11-before/<name>.png`, then Read). Name any image that looks wrong: wrong colours, text cut off or overlapping, an empty or mis-framed board.
2. Alt text: each card's alt text lives in `src/learning/content/<chapter>PreviewCopy.ts` (and `guidedExamplePreviewCopy.ts` for the retained set; the retained set is already published and out of scope unless its copy names something the image does not show). For every changed image, check that its alt text (Slovenian and English) describes what the new image shows. Fix alt text that names board text or readouts the image no longer shows (for example, a percentage, a readout line or a label the capture-text rule hides), or a colour the image no longer uses. Change only what is wrong, keep the sentence style, and keep Slovenian and English in step. Math notation: wrap symbols in `\\(...\\)` and use `{,}` for decimal commas (see `AGENTS.md`, "Lesson prose").
3. Page: copy two before/after pairs per changed chapter into `docs/reviews/site-walkthrough/graphs/b11/before/` and `after/`, named `<chapter>--<file>.png`, and write `docs/reviews/site-walkthrough/graphs/b11/index.html` in the format of `../b9/index.html`: one section per chapter with its image pairs and one sentence on what changed, plus a short section listing the alt texts you changed.

**Acceptance.**
- A. Every changed chapter is listed in your report as reviewed, with the images you read and any that look wrong.
- B. Each alt text you changed now matches its image; `just unit src/learning/content/lessonMathNotation.test.ts src/learning/content/guidedExamplePreviewCopy.test.ts src/learning/chapter/guidedExamplePreviews.test.ts` passes. Also run `npx tsc --noEmit --pretty false` if you changed any `.ts` file. Do not run bare `npm test` or `npx vitest`.
- C. `b11/index.html` opens and every image it references exists.
- D. `git status --short src/` lists only PNG and manifest files under `src/images/learning/examples/` plus the `*PreviewCopy.ts` files you changed.

**Owned paths.** `src/learning/content/*PreviewCopy.ts` (alt text only), `docs/reviews/site-walkthrough/graphs/b11/` (except the two brief files), `.command-logs/b11-before/`, `.command-logs/b11-review-*`.

**Return.** ≤300 words: a table of chapter → images read → verdict, the list of images that look wrong, and the list of alt texts changed (`file:line`). Put the fuller note in `docs/reviews/site-walkthrough/graphs/b11/worker-part2.md`. On `BUDGET HANDOFF`, stop and write that note with the chapters still to do.
