# Worker notes: captures runnable again, envelope colours

## Part 1

- Cause: 138 Demonstrations, 134 recipes, 118 stored captures. Sixteen Demonstrations have a recipe and no stored capture; `complex-power`, `complex-euler`, `recursion-cobweb`, `contour-map` have neither. `validateRecipes` required recipes to equal the catalog exactly, so the four failed it. Observed before: `scripts/demonstration-preview-capture.test.cjs` failed "Recipes must exhaustively match shipped IDs" (the four listed as missing); a second test there ("number actions ...") failed with `page.locator is not a function`: the mock page lacked `locator` and `.and`, unrelated to the four (the brief expected one cause).
- Rule now (`scripts/demonstration-preview-recipes.cjs`, `validateRecipes(demonstrations, registry, captured)`): no recipe for an unknown ID; every ID in the committed manifest needs a recipe. Capture (`scripts/capture-demonstration-previews.cjs`) skips a Demonstration without a recipe (loop and expected-capture list); recapturing such an ID by name fails with "Recapture ID without a capture recipe".
- C3: `foreignLetterRuns` in the recipes file; test "C3 ..." in `demonstration-preview-text.test.cjs`. The committed `curve-envelope` capture has a text recipe but was stored before `textKept` existed, so the manifest check skips captures without `textKept`. First run of the test failed with a SyntaxError from a bad regex escape (the checker did not work); fixed, then passes with the failing-string cases.
- `just tooling-test` list: both test files added in `scripts/commands.cjs`.

## Recapture one clip now (not run)

The preview must serve a build of the current source (the capture records `servedBuild` and a presentation fingerprint); the one on port 4333 is older, so it needs a fresh `just build` and restart first, which the brief forbids for the worker.

```
PREVIEW_BASE_URL=http://127.0.0.1:4333/bezeg-2.0 PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1 just clip <id>
```

`PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1` is the operator flag for the first row of a new presentation fingerprint; later clips omit it. `just clip` sets `PREVIEW_RECAPTURE_IDS` and `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE` itself. Non-publishing trial: `PREVIEW_BASE_URL=... PREVIEW_IDS=<id> PREVIEW_MOTION_IDS=<id> node scripts/capture-demonstration-previews.cjs`.

## Part 2

- Family is 8 curves ("bands") of consecutive lines, blue (`comparisonCurve`) to teal (`additionalCurves[0]`) by RGB interpolation over the band, width 1. Reason: a JSXGraph curve has one colour; per line curves (up to 200) would change element counts. With fewer than 8 lines some bands are empty. Current line: `constructionAccent`, width 4; point: accent fill, `pointOutline` stroke.
- Existing tests that cover "each family line is the de Casteljau line at its parameter": `expectFamilyIsKernel` against `envelopeFamily` plus the x/(1-t)+y/t=1 loop (opening-scene test). Touching point on the curve: `expectTouchIsDeCasteljau` and sqrt(x)+sqrt(y)=1. The test helper `family()` now joins the bands, so these assertions are unchanged.
- Lesson: `src/learning/content/curveGeometryGuidedLessons.ts` (sentence at line 1180). No sentence in sl or en names a colour of the lines or the point. Lines 1175-1176, 1181 and 1184-1185 say "poudarjena/highlighted", which stays true.
- No screenshot taken (cannot).
