# 14. Batch C release

**Source spec:** [Analysis guided lessons](../../specs/analysis-guided-lessons.md), Batch-wide acceptance gate

**Dependencies:** [10](10-sequence-convergence.md), [11](11-uniform-convergence.md), [12](12-fixed-point-iteration.md), [13](13-complex-multiplication.md)

**Status:** released 2026-10-16

## Steps

1. Register the routes in `src/Routes.tsx`. Add catalogue entries in `src/demonstrations.ts`: three under Analysis and complex multiplication under Foundations (`basics`). Register the preset collections and add the four ids to `GUIDED_LESSON_AVAILABLE_IDS`. Update the count assertions.
2. Capture static previews from a production build: `vite preview` on port 3012, then `scripts/capture-demonstration-previews.cjs`. Restore the unrelated PNGs the script rewrites, and merge the manifest for the four new ids only.
3. Update the capability documentation and `docs/current-architecture.md` where ownership changes. Correct ADR 0011 ("eleven topics" becomes ten in Analysis, with complex multiplication in Foundations). Update the spec status and this task list.
4. Review the integrated diff with parallel reviewers for mathematical correctness, engineering constraints, and UI/accessibility.
5. Verify:
   - TypeScript, unit and content tests (including `lessonMathNotation.test.ts`), and the production build.
   - The full production smoke suite, because the catalogue changed.
   - A scripted browser pass over the four routes: desktop (1440 px) and narrow (390 px, touch context), drag, keyboard, reveals, iterative playback, and a live SL/EN switch.
   - Board screenshots of every example, checking for caption and label collisions.
   - Lesson frames at 390 px, checked for overflow with a margin. Hosted CI on Linux Chromium renders formulas wider than Windows. Split long inline `=` chains in prose, never in `*Latex` fields.
6. Fetch, rebase only the Batch C commits onto `origin/master`, recheck, and push as a fast-forward. Stop and report on rebase conflicts.

## Release record

Release (2026-10-16):

- **Registration:** routes, catalogue entries (three in Analysis after Taylor, complex multiplication in Foundations after Bernstein), preset collections (`sequence`, `uniform-convergence`, `fixed-point`, `complex-multiplication`), allowlisted lesson ids and count assertions; 45 routes in total, 10 in the Analysis family and 2 in Foundations. These were registered by the topic commits, as in Batch B.
- **Base:** the six topic commits were cherry-picked onto `origin/master` before review, because the owner had meanwhile published other work to `master`; reviews and verification ran on that base.
- **Previews:** real captures for the four routes from the production build; the manifest was merged for these four ids only and no other preview changed.
- **Documentation:** capabilities, architecture (the shared `IterativeFunctionGraph` and other shared additions), UI functionality counts, the ADR 0011 correction (ten topics in Analysis, complex multiplication in Foundations) and the spec status.
- **Reviews:** parallel mathematics, engineering and UI/accessibility reviews. Fixed in `f694407`: a shared `N` exists for `x^n` on `[0, 1]` at `epsilon = 1` (the supremum `1` is not attained; the task file had stated the opposite); band membership for a candidate limit other than the true limit was decided in floating point, so a term exactly on the band edge was drawn inside (now exact on a `0.01` grid for `L`); wording that over-claimed what failure of the contraction hypothesis means; a Slovenian mistranslation of the oscillation reason; Slovenian terms (negibna točka, zmnožek, intervals with semicolons); Fit flattening the sequence board; focus loss on disabled buttons; gaps in confirm-applied number fields; and duplicated iteration wiring, helpers and CSS (now `IterativeFunctionGraph` and shared helpers). Board layout collisions were fixed in `1120354`.
- **Browser verification:**
  - The full production smoke suite passed 199/199 at `d5c2214` (183 before Batch C plus 16 new rows).
  - Each topic worker ran its own smoke row before hand-back, unlike Batch B, where rows were only syntax-checked until the release run.
  - A scripted pass over the four routes covered desktop (1440 px) and narrow (390 px, touch context): dragging, ArrowUp in a number field, the reveal via Tab focus and Enter, Next step via Enter and Play/Pause on the iterative routes, and a live SL→EN→SL switch with board text and readouts re-rendered. No page errors and no horizontal overflow.
  - Board screenshots of every example at both widths before and after the layout round.
  - No inline formula in the Batch C lesson prose reaches the length that overflowed hosted Linux Chromium in Batch B.

- **Hosted CI:** the first push (`feaff50`) failed 198/199. On Linux Chromium, the first frame of Taylor step 1 (a Batch B lesson whose content Batch C did not change) measured 400 px at 390 px. It was marginal: the previous master run had passed it. The unbreakable inline sum in its prose was rewritten as shorter formulas that can wrap.

**Known limits:**

- At `epsilon = 0.5` the sequence band edges still run through the x tick row and the `−0.5` tick; in the complex `zero` example at 390 px the `zw` label hides the `1` tick.
- The sequence catalogue preview is flat: the shared capture script frames every preview with equal axis units, which squeezes an index-against-value plot. Changing the script would regenerate every preview; the representative-preview work is the place to fix it.
- Display formulas wider than their notation box scroll inside it without a visible cue (shared lesson design; the longest Batch C chains were split in two).
- No physical touch device or projector was used. GitHub Pages hosting was not exercised locally. The Slovenian lesson text still needs owner review, and the Analiza I section citations are listed as unresolved questions.
