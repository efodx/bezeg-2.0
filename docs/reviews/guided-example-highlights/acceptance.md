# Guided example highlights: acceptance

Date: 2026-11-02. Spec: [guided-example-highlights.md](../../specs/guided-example-highlights.md). Tasks: [guided-example-highlights/](../../tasks/guided-example-highlights/README.md). Delivered by the Learn UI [feature stream](../../tasks/feature-streams/learn-ui.md#3-guided-example-highlights), handlers 4–13. Stable revision: `9fb9862d` (production build of `12d5aadb`; `9fb9862d` adds only the recapture manifests and inventories) (checks below ran at `12d5aadb`/`9fb9862d`, rebased on `origin/master` `fd2a176a`).

## Result by criterion

| Criterion | Result | Evidence |
| --- | --- | --- |
| H1 Figure removal | Pass | All 29 placements removed (17 family-chapter, 12 Bézier patches). The `figure` ordered-content kind, `FamilyChapterFigure`, section `figures` and the renderer branches in `ChapterPage.tsx`/`FamilyChapterPage.tsx` are deleted (`5664ca35`, `d1a40ea6`). Gate: `src/learning/content/chapterContentKinds.test.ts` allows only paragraph, formula, example and playground items and no `figures` key in any section of either language; it failed with 55 offending entries under a mutation. The Geometry stream's triangulation chapter, which landed after 05a, only needed the type argument dropped (`12d5aadb`). Dispositions: 27 of 28 checked rows honored, plus row 7 kept on purpose (below); [reconciliation](05-reconciliation.md). |
| H2 Authored recipes | Pass | 67/67 examples have a recipe: 7 `start` by recorded choice, 60 `highlight`. Deviations from the audit are listed below. |
| H3 Capture and validation | Pass | Both inventories regenerated, and both full captures ran against the production build of `12d5aadb`: 56 retained + 11 patch previews, every recipe board check passed, every PNG byte-identical; manifests changed only in provenance and two recipe fingerprints (`9fb9862d`). Images are 840×520 (420×260 CSS at 2×). The start-scene and catalog capture flows are intact; the Bézier activity-figure capture (`scripts/capture-chapter-figures.cjs`) is retired, with a note in `docs/commands.md`. |
| H4 Mathematically faithful | Pass | Independent mathematical review of every highlight caption found no false claim ([05-math-review.md](05-math-review.md)). Repairs `797676d2`: accumulation tangent check, sequence `types: {segment: 4}`, Darboux caption hedged to "computed values", patch de Casteljau "one pass in u, then one in v", Slovenian semicolons only beside decimal commas. Each new check failed under a mutation. `lessonMathNotation.test.ts` passes unchanged in `just check`. |
| H5 Larger card image | Pass | Task 02 (`a3dc9d4c`): image 240→364 px at 1440/1280, 280→328 px stacked at 390, ratio 21:13; before/after screenshots and dimensions for the quintic PH and Bézier cards in [layout note](layout/layout-note.md). Rechecked in this smoke: image beside the copy at 1440 and 1920, stacked above it at 390, ratio 1.62, no horizontal overflow at 1440, 1920, 390, and 390 and 1280 with 200% text. |
| H6 Unchanged flow | Pass | No route, anchor, example id, preset or storage change. Browser: every chapter launches its example from the prepared scene and returns to the owning section with focus on the launching link; keyboard-only launch and return; Back/Forward. |
| H7 Verified coverage | Pass | Reconciliation: 67/67 cards with SL/EN caption and alt text, an image and a manifest entry, no duplicates or orphans. Browser, all nine chapters in SL and EN: 67 cards (12/3/7/6/7/3/9/9/11), zero section figures, every image decoded with alt text and caption, no raw TeX, no console or page errors. |

## Recipe deviations from audit 00

1. `foundations.complex-plane.complex-multiplication`: start, not the audit's highlight after Show product, because Show product is a button and not a recipe step kind ([batch A note](batch-a-note.md)).
2. `bezier-curves.parameter.decasteljau-parameter`: start, not the audit's t = 1/4. Its activity lesson is one synthetic step with no frames, so the existing step kinds cannot reach t = 1/4 (stream record 03a). The reconciliation calls this reason questionable, since the prompt asks for a slider move; a future set-control step on that lesson could author it.
3. `bezier-patches.bilinear-patch`, `control-net`, `boundary-iso-curves`: first-frame `highlight` recipes where the audit said start is best. They show the same frame; no patch frame has a learner action (stream record 06).
4. `ph-curves.complex-hodograph.ph-cubic-generator`: highlight at frame `instruction`, where the audit said start, because frame `observe` differs from start and `expectChange: false` failed in capture (stream record 04a).
5. `ph-curves` quintic offsets card at d = −2,5 (D10 handler choice; [distance note](ph-singularity-distance.md)); the cubic card takes the D10 fallback.

## Review findings and dispositions

- **Engineering review (Sonnet) of 05a:** no blocking finding. A documentation finding on `illustrated-chapter-examples.md:18-19` is handled by a supersession note under that spec's status line (`0e326c6f`).
- **Mathematical review (Sonnet):** findings 1–4 repaired in `797676d2`. Finding 5 deferred: `square-vs-triangular`'s claim about the tensor overlay and the height difference is true, but the surface-check format cannot express it, so it is unasserted. Information only: rational weights are implied by the asserted points.
- **Reconciliation (Haiku, two passes):** F1 (a cast-produced figure item in `familyChapters.ts`) no longer exists; no `figure` kind remains in learning content. Row 7's "not the curve integrated from the origin" clause (`familyChapters.ts:238`) is kept on purpose: it is live-graph guidance in the `ph-cubic` investigation prompt, not a caption of the removed figure. The `bezierChapter.ts` "picture/slika" sentences (SL/EN 126/213, 129/216, 263/264) refer to the adjacent card image and stay.
- **UI/accessibility review of smoke screenshots:** the handler reviewed the projection (`ph-curves-1920-sl.png`) and 390 at 200% text (`splines-390x200-sl.png`) screenshots in the main chat. Image and copy proportions, legibility and stacking are as specified. The smoke flagged the sticky »Vsebina poglavja« chapter navigation over a caption at 390 with 200% text: it is the existing sticky navigation captured mid-scroll in a full-page screenshot, not a layout defect of this feature.

## Commands

- `just check` at `12d5aadb`: passed in 1502 s (typecheck, lint, all unit tests, production build). The first run at `c0d1ab6a` failed typecheck on the upstream triangulation chapter, fixed by `12d5aadb`.
- After a second rebase onto `df67c48e`, the Maps stream's new `triangleGeometryChapter.ts` needed the same type-argument fix. Typecheck, `just unit src/learning/content src/learning/chapter` (including the figure gate) and `just build` passed.
- `node scripts/generate-guided-example-inventory.cjs` and `--patches`: exit 0.
- `node scripts/capture-guided-example-previews.cjs docs/reviews/illustrated-chapter-examples/capture-inventory.json` (56) and `… docs/reviews/bezier-patches/guided-example-inventory.json --family patches` (11) against `just preview 4387`: exit 0. A first attempt was stopped by Claude Code for low memory and rerun once.
- Earlier per-batch checks are in the stream record and batch notes ([A](batch-a-note.md), [B](batch-b-note.md), [patches](batch-patches-note.md)).

## Browser coverage

`bezeg-smoke` (Sonnet) against `just preview 4387` of `12d5aadb`, Chromium; [report](acceptance-smoke/report.md), screenshots in [acceptance-smoke/](acceptance-smoke/).

- All nine chapters (`bezier-curves`, `foundations`, `rational-curves`, `splines`, `ph-curves`, `parametrization`, `functions-and-calculus`, `analysis`, `bezier-patches`) in SL and EN: card count, zero section figures, decoded images, alt text, captions, no raw TeX, no console errors.
- Live language switch without reload on `bezier-curves` and `splines`: alt text and captions change language.
- Viewports 1440×900, 1920×1080, 390×844, and 390 and 1280 with 200% text: no horizontal overflow; side-by-side versus stacked layout as specified.
- Launch and return in all nine chapters (three in SL); keyboard-only launch and return on `bezier-curves` (SL) and `ph-curves` (EN); Back returns to the section and Forward reopens the example.
- Also passing, outside the nine: launch, return and history on `linear-maps`, `complex-maps`, `convexity-hulls` and `triangulations-voronoi`.
- Not applicable: catalog Demonstrations offer only a »Nazaj v poglavje« return link (checked for `bezier-curves#control-points` and `ph-curves#arc-length-problem`), not an entry into an example; cards have no image lightbox.

## Gaps and open owner items

- D10: quintic offsets at d = −2,5 awaits owner confirmation.
- D4/D6/D12: no 4×3 net card; the tensor-joins and properties picture choices.
- Mathematical review finding 5 (`square-vs-triangular`) is unasserted.
- `ph-cubic-speed` and `ph-cubic-offset-length` have visually identical images (both d = 1, per the audit).
- The chapter-owned inventories of other streams (`linear-maps`, `complex-maps`) belong to the Maps stream and were not recaptured here.
- Found earlier, out of scope: after Extrapolate, the extrapolation graph keeps drawing to `extrapolationT` (`AbstractJXGBezierCurve.ts:359`).
- Physical projector observation is optional under the release policy and was not done.
- Browser gaps: 200% text simulated with root font size rather than browser zoom; the 1280 at 1.5× projection variant was not run; "opens from the starting scene" was judged from the visible board and the `?example=` URL, not scene state.
- `convexity-hulls` (3 cards) and `triangulations-voronoi` (1 card) render cards without image or caption. They belong to the Geometry stream, outside the 67; their F5 media slices author highlight recipes now that `G-HL` is open.
