# Highlight capture, part A (machinery)

## Recipe format
`src/learning/chapter/guidedExampleHighlights.ts` (type `HighlightRecipe`, registry `guidedExampleHighlightRecipes`, keyed by example id, currently empty). It is the only source; the generator resolves it, copies it into each inventory entry and fingerprints it. Absent key = start scene, written into the inventory as an explicit `{kind: 'start'}`.

```ts
'foundations.worked-weight.bernstein.degree-comparison': {
  kind: 'highlight', frame: 'weights',
  steps: [{kind: 'frame-action'}, {kind: 'goto-frame', frame: 'result'}],
  expectChange: true,
  checks: {types: {curve: 3}, curveCount: 3, curves: [[[0,1],[0.5,0.25],[1,0]], ...]},
}
```
(illustrative; frame ids must exist in the example's lesson)

Steps reuse what a learner has: `goto-frame` uses the lesson Previous/Next buttons (either direction); `frame-action` presses the authored action button of the current frame (`LessonFrame.action`, or the inherited step action). There is no arbitrary-LessonAction step: applying one would need a production-side hook in the lesson runtime, which I did not add.

## Inventory (resolved form)
Entry gains `recipe` and `recipeFingerprint` (sha256 of canonical JSON). Highlight recipes are resolved to lesson positions (`position {step, frame}`, 0-based) and button labels (Slovenian); unknown, ambiguous or action-less frames fail generation. Both committed inventories were regenerated (only recipe fields added; verified field by field) and both manifests migrated by adding `recipe`/`recipeFingerprint` to each capture. PNGs and checksums untouched.

## Runner
`scripts/capture-guided-example-previews.cjs`: `reachFrame`, `applyHighlightRecipe`, highlight branch in `captureExample`. Frame stays 420x260 at scale 2. Start entries follow the old path. Highlight captures record `recipe`, `recipeFingerprint`, `highlight` (frame, steps, start/result board fingerprints, `changedFromStart`, per-check results, evidence), `viewport`, `deviceScaleFactor`. Surface (patch) routes reject highlight recipes.
Inventory fingerprint includes the recipe fingerprint only for highlight entries, so the start-only inventory hash (checked by `guidedExamplePreviews.test.ts`) is unchanged.

## Validation (`scripts/guided-example-preview-api.cjs`)
`validateRecipe`, `verifyHighlight`, `assertCaptureMatchesRecipe`, `validateHighlightCapture`; empty-inventory assertion in `validatePublishedSet` and `validateRetained`.

## Tests and mutations
New `scripts/guided-example-highlight-recipes.test.cjs` (11 tests); fixtures in `guided-example-preview-api.test.cjs` carry recipes. Each assertion was disabled in turn and the tests failed: expectChange/unchanged board, empty highlight board, stale recipe fingerprint, stale recipe body, recorded checks failed/missing, recorded change vs expectChange, empty checks, missing recipe in inventory, unknown frame, frame without action, step-failure context, wrong-frame step, highlight recipe in the inventory fingerprint, checksum, missing file, empty inventory gate (both functions). Unreachable-frame has two redundant guards; each alone survives, both off hangs the test (killed by timeout).

## Not verified
No browser run of the highlight path (no recipe exists yet); the fake-page test covers navigation/steps logic only. Start path not re-captured. Scripts tests run with `node --test` (the `just tooling-test` slot runs only `commands.test.cjs`).

## Part B
1. Add three entries to `guidedExampleHighlightRecipes` (S1 quintic PH offset, S2 rational weight, S3 weighted parameterization alpha 0.25) with real frame ids and expected geometry (D10 distance as a `checks` point/curve or types).
2. `node scripts/generate-guided-example-inventory.cjs` (and commit the inventory), `just build`, `just preview 4387`, then `node scripts/capture-guided-example-previews.cjs <inventory> ` WITHOUT `--id` the first time (presentation/build fingerprints changed; partial regeneration is refused until a full run).
3. Check every failure mode against a real recipe, update docs/commands.md.
Limits: steps are frame navigation and frame actions only; animations and direct controls are not scriptable; checks need three-sample curves.
