# Batch patches (task 06) note for task 05

Date: 2026-11-02. Chapter `bezier-patches`. Source: [task 06](../../tasks/guided-example-highlights/06-batch-patches.md), [spec](../../specs/guided-example-highlights.md) owner decisions D2, D4, D6. Stream record: [learn-ui](../../tasks/feature-streams/learn-ui.md#3-guided-example-highlights).

## Delivered

- **Figures (06b, `d2d79977`):** all 12 placements removed: the 11 card start images that `patchChapter.ts` added as section figures, and the catalog `patch-tensor` poster in `curve-to-patch`. The `figures` option of `patchSection` and the figure mapping in `patchBasicExampleSequence.ts` are gone. No prose rewrite was needed: the only text about the 4×3 net "not shown" was the removed caption, and the 4×3 computation (12 points, degrees (3,2)) already stands in the `curve-to-patch` paragraph in both languages (D4). `patchChapter.test.ts` asserts no section figures and no `figure` ordered content (fails against the previous `patchChapter.ts`, log `docs/reviews/feature-streams/learn-ui/logs/06b-mut.log`).
- **Recipes (06a, `4a5de72f`):** the capture runner now accepts highlight recipes on surface routes (`goto-frame` and `frame-action` steps; inspector steps are rejected with a clear error). A patch recipe names `checks.surfaceStep`, the lesson step whose expected surface, computed from the lesson fixture in `patch-guided-example-expectations.cjs`, the published route evidence must equal. `expectChange` is enforced in both directions through a signature of the published camera, owners with geometry samples, and control point ids (never pixels). Recipes are keyed by full example id (`bezier-patches.<section>.<demonstration>`), so the card copy lookup finds them. Seven mutations of the new checks each failed their test (`logs/06a-mut.log`).
- **All 11 recipes are first-frame highlights with `expectChange: false`.** No patch lesson frame has a learner action. The `tensor-decasteljau` rows/columns switch is not a learner control (frame `order-columns` shows the same scene), and `tensor-subdivision` applies elevation in its step scene, so its first frame is already elevated. D6 holds: `tensor-joins` shows `join-c0`, `properties` shows `hull-affine`, `curve-to-patch` the start scene.
- **Copy:** the highlight copy entries reuse the section copy in `patchGuidedPreviewCopy.ts`, which was written for these exact scenes and states each card's claim.
- **Capture (`5a4f48c6`):** a full `--family patches` capture against the production preview of `4a5de72f` passed every surface check. All 11 PNGs are byte-identical to the previous ones; the manifest now records each recipe and its checked surface.

## Evidence

- Node guided-example tests: 58 of 59 before recapture (the failing one was the stale-manifest check, fixed by recapture). Typecheck clean; `just unit src/learning/chapter/guidedExampleHighlight` passed; 06b's patch chapter, integration and notation units passed; `just build` passed at `4a5de72f`.
- Smoke (`bezeg-smoke`, Sonnet, preview of `4a5de72f`, Chromium 1280×800 and 390×844, SL and EN with live switch; screenshots in [batch-patches-smoke/](batch-patches-smoke/)): no section figures; all 11 card images decode (after lazy load), with alt and caption that switch language; no horizontal overflow; no console or page errors; no raw TeX. Launch/return passed for `tensor-joins`, `properties` and `curve-to-patch` in SL and `tensor-joins` in EN, landing on the owning section with focus on the launching link. The one "slika" hit is the generic first-draft notice in `FamilyChapterPage.tsx:97`, not a removed figure.
- Handler viewed the `properties` and `tensor-joins` images against their copy.

## Gaps for task 05

- The `tensor-joins` alt text names "a tangent-direction kink", which the top-down camera of the card image does not show (the image shows two patches sharing the blue edge). The text is shared with the catalog `patch-joins` copy, so the fix touches both.
- The `properties` image draws the patch small under a tall net; legible but tight.
- Because all patch highlights equal the start scene, the patch cards gain checks and evidence, not new pictures. A richer patch picture (mid-sweep, swapped order) would need learner actions in the patch lessons.
- Not covered: lightboxes, projection size, enlarged text, keyboard-only launch, Back/Forward (task 05's full smoke).
