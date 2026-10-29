# Task 13 implementation boundaries

Read-only handoff for task13 after tasks11/12 close. Current worktree has uncommitted task11 runtime/spec/docs and task12 chapter/review files; preserve them and do not start task13 on this snapshot until their owners finish and the handler establishes the integration point.

## Ownership and seams

- Task11 owns lesson action/runtime contracts: `src/graphs/patches/patchLessonActions.ts`, `src/learning/runtime/lessonCatalog.ts`, scene construction/checkpoint behavior, and lesson restoration. Task13 should consume these actions synchronously and add authored chapter examples; request a distinct task11-owned runtime change only if a demonstrated gap blocks an example.
- Task12 owns the 11 bilingual chapter sections and their explanatory prose/figures: `src/learning/content/patchChapter*.ts` and `patchChapter.ts`. Freeze those when task12 closes. Task13 owns chapter example identity/actions and capture/presentation copy: `src/learning/chapter/guidedExamples.ts`, `src/learning/content/guidedExamplePreviewCopy.ts`, `src/learning/chapter/guidedExamplePreviews.ts`, guided-example PNGs/manifests, plus patch catalog prompts/metadata and motion assets/recipes. Keep ownership changes localized; `guidedExamples.ts` and `demonstrations.ts` are shared registries.
- Existing entry contract is `?example=lesson.<chapter>.<section>.<demonstration>`; `resolveGuidedExample`/`canonicalExample` in `guidedExamples.ts` sets owner and scene. `getGuidedExamplePreviewCopy` and `resolveGuidedExamplePreview` map retained identities to bilingual caption/alt text plus `/src/images/learning/examples/<id>.png`.
- `tests/smoke-catalog.cjs` derives route rows from the demonstration metadata and already covers all six patch routes, but does not give each guided example its own acceptance row. `tests/guided-lessons.smoke.spec.cjs` is the route-level harness to extend; keep route-mount coverage distinct from example identity/state/return coverage.
- `scripts/generate-guided-example-inventory.cjs` loads that registry and records exact actions/prepared-scene fingerprints. `scripts/capture-guided-example-previews.cjs` currently delegates to `presentBoard` and `guided-example-preview-api.verifyEvidence`, which require a live JSXGraph board and nonempty graph geometry. A patch route is WebGL surface-only (`demonstrations.ts` `view: 'surface'`), so this bridge cannot currently prove/capture a guided surface example. Add a surface path with real WebGL context, published camera/framing, nonempty rendered owners, and expected patch/teapot state; never infer success from pixels alone.
- The six active routes are already in `src/demonstrations.ts` and smoke catalog metadata: tensor, de Casteljau, derivatives, subdivision, joins, triangular. Catalog poster capture already has per-route camera recipes in `scripts/demonstration-preview-recipes.cjs` and surface verification in `capture-demonstration-previews.cjs`. `src/images/demonstrations/catalog/manifest.json` currently has poster captures for all six and no patch motion records. The motion pipeline is separate (`scripts/demonstration-preview-motion.cjs`, capture/generate scripts); extend it for orbit and parameter sweeps only as needed, asserting actual scene state/owner and exact first/last poster identity.
- Host-fit seam: `TensorPatchGraph`/`TriangularPatchGraph` reset camera using `fitCameraTo(..., this.hostAspect(), authored)` (`TriangularPatchGraph.resetView` near line285; tensor counterpart); capture camera recipes are fitted at 360×220. Task13 carries deciding whether a fresh Demonstration should fit its opening camera to its actual host. Preserve authored preview camera/capture provenance and chapter return/independent catalog entry behavior while deciding.

## Acceptance-to-content map

Use one stable example id and smoke row per concept, all with exact authored actions/fixtures, two complete bilingual frames, cancellation/restoration checks, and production capture evidence. The task spec's coverage maps as follows:

1. Moving curve sweeps patch → `patch-tensor`.
2. Bilinear saddle and hand-computable midpoint → `patch-tensor`.
3. Tensor net, counts, partition and corners → `patch-tensor`.
4. Boundary/iso-curves and computed iso control points → `patch-tensor`.
5. Two-stage/direct de Casteljau and order independence → `patch-decasteljau`.
6. Convex hull, affine invariance, variation-diminishing counterexample → `patch-tensor`.
7. Partial derivatives, tangent plane, normal, twist → `patch-derivatives`.
8. Subdivision/elevation invariance → `patch-subdivision`.
9. C0/C1/G1 distinction plus licensed 32-patch Utah teapot orbit → `patch-joins`.
10. Barycentric centroid/de Casteljau and boundary curves → `patch-triangular`.
11. Same-boundary-degree tensor/triangle comparison (overlay) → `patch-triangular`.

## Suggested serialized slices (~20 worker turns)

1) Close/rebase on task11+12 integration and freeze their owned files. 2) Extract final action/runtime API and authored section IDs. 3) Write coverage ledger with stable IDs, expected math/state, bilingual frame checklist, route and smoke row. 4–8) Author examples 1–5 in small content batches, one route family at a time; add focused synchronous scene/restoration tests. 9–12) Author examples 6–11, reserving explicit triangular comparison and teapot owner checks. 13) Add coverage assertions tying all 11 section IDs to valid examples and demonstrations. 14) Add surface guided-example capture API alongside board capture; retain source-build freshness checks. 15) Add real WebGL/camera/owner mathematical evidence and empty-owner rejection tests. 16) Capture six route posters and all guided-example images from a verified production build; record hashes/provenance. 17) Add six motion recipes, orbit/sweep bounds, endpoints matching posters, size/readability checks; regenerate clips. 18) Extend smoke rows for each example plus language, keyboard, touch, return, and all six route mounts; include triangular comparison and teapot orbit. 19) Run focused lesson/recipe/capture checks and `just check`; repair only task13-owned files. 20) `$smoke-tester` all patch examples/routes and record source→scene→capture mapping, failed checks, and coverage in `docs/reviews/bezier-patches/examples-previews.md`; handler reviews and commits.

## Commands and cautions

Start with `just --list` (available: `just unit <vitest args>`, `just build`, `just check`, `just smoke-built`, `just smoke-lesson <ids>`). Focused candidates: `npx vitest run src/learning/chapter/guidedExamples.test.ts src/learning/chapter/guidedExamplePreviews.test.ts src/learning/content/guidedLessons.test.ts src/learning/content/lessonMathNotation.test.ts`; `node --test scripts/capture-guided-example-previews.test.cjs scripts/guided-example-preview-api.test.cjs scripts/demonstration-preview-motion-runner.test.cjs`; route acceptance via `$smoke-tester` and recorded Playwright smoke rows. Lesson prose must keep every symbol/formula delimited and use `{,}` decimal commas; translations stay lockstep. Do not touch current task11/task12 dirty files, bypass stale-source validation, or claim capture from empty/canvas-only evidence.
