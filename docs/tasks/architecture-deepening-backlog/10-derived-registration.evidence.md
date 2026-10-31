# 10. Derived registration - evidence (slice 1)

Slice 1 covers the checklist, derived lesson availability, and the single Demonstration resolution. Preview assets and the capture manifest are a later slice and appear below only as checklist rows. Places were found by searching the repository for an existing id (`fixed-point`, `patch-joins`) outside tests, so the specification's list is corrected where stale.

## Checklist: what a new Demonstration and a new lesson touch

| # | Place | Before: enforced by | After: enforced by |
|---|---|---|---|
| D1 | `src/demonstrations.ts` definition | Source of truth: `DemonstrationId` derives from it | Unchanged |
| D2 | `src/graphs/graphFactories.ts` | Typecheck (`Record<DemonstrationId, ...>`) | Unchanged |
| D3 | `sl.ts` / `en.ts` keys (title, prompts) | Typecheck (`TextKey`) and the lockstep localization tests | Unchanged |
| D4 | `src/demonstrationPreviewAssets.ts` (generated) | Typecheck fails until capture runs (`Record<DemonstrationId, string>`) | Typecheck passes; `src/demonstrationPreviewAssets.test.ts` fails naming missing ids and the regeneration command (slice 2) |
| D5 | `src/demonstrationMotionAssets.ts` | Nothing (`Partial<Record<...>>`) | Unchanged: already `Partial`, and a missing clip simply keeps the still poster (slice 2) |
| D6 | `scripts/demonstration-preview-recipes.cjs` | Capture script only; `demonstration-preview-capture.test.cjs` tests recipe validation, not coverage of every id | Unchanged: `validateRecipes` already fails with an "exhaustively" error in `scripts/demonstration-preview-capture.test.cjs` (slice 2) |
| D7 | Capture manifest: was `src/images/demonstrations/catalog/manifest.json` with absolute machine paths; now `scripts/demonstration-previews/manifest.json`, repo-relative | Nothing | Not bundled by Vite; a node test rejects absolute paths (slice 2) |
| D8 | Family collection file (`graphs/functions/functionPresetCollections.ts`, `graphs/patches/patchPresetCollections.ts`; curve families have their own) | Not verified here | Unchanged, not verified |
| D9 | `src/learning/chapter/guidedLessonOwnership.ts` `guidedLessonOwners` | Typecheck (`Record<DemonstrationId, ...>`) | Unchanged |
| D10 | `src/learning/content/guidedExamplePreviewCopy.ts` | Typecheck (`satisfies Record<DemonstrationId, ...>`) | Unchanged |
| L1 | `src/learning/runtime/lessonAvailability.ts` hand-kept 51-id list | Hand-kept; comments in `analysisGuidedLessons.ts:3` and `functionGuidedLessons.ts:3` told authors to edit it; `lessonCatalog.test.ts` asserted the same list a second time | Removed: derived from D1 (see below) |
| L2 | Lesson content file plus its entry in `guidedLessons.ts` `allLessonByDemonstration` (or the patch registry) | Nothing alone; the availability list masked a missing lesson | `lessonCatalog.test.ts` "derives lesson availability ..." fails when content and availability disagree |
| L3 | Smoke row in `tests/guided-lessons.smoke.spec.cjs` | `lessonSmokeCoverage.test.ts` (failing test) | Unchanged |
| L4 | Ownership entry (`guidedLessonOwners`, retained example homes, `familyChapters.ts` prompts) | D9 by typecheck; `guidedLessonOwnership.test.ts` checks every available lesson has an owner. Chapter prompts: nothing | Unchanged |
| L5 | `model.ts` names | Only when a new action kind or parameter name is needed. `FunctionParameterName` is already defined once (`model.ts:19-20`), so the specification's "written twice" is stale | Unchanged |

Counts: a new Demonstration still touches D1-D3, D8-D10 (typecheck or nothing) and the later-slice D4-D7. A new lesson went from L1 + L2 + L3 + L4 + L5 to L2 + L3 + L4 + L5, where L1 is gone and L2 is now test-enforced.

## Decision: lesson availability (item 2)

Chosen: true derivation without lesson content. Every `Definition` in `demonstrations.ts` offers a lesson unless it sets `lesson: false`; `LESSON_DEMONSTRATION_IDS` is derived from the definitions, and `lessonAvailability.ts` exposes `GUIDED_LESSON_AVAILABLE_IDS` / `isGuidedLessonAvailable` from it. Reason: deriving from content itself would make the home page and catalog (`DemonstrationCollection`, `HomeDemonstrationsCarousel`, `DemonstrationsOpeningPrototype`) import about 1 MB of lesson source, so the id set is derived from the definitions, which those pages already import. The old "reviewed allowlist" intent is now a test: `lessonCatalog.test.ts` requires that availability equals the set of Demonstrations that have authored content, in both directions, and that each available id resolves through `getLessonForDemonstration`. A Demonstration deliberately without a lesson sets `lesson: false` (none today). The ids are now in catalog order, not the old hand-kept order; consumers use them only as a set or for partitioning.

## Bundle effect (`vite build` of HEAD vs this worktree, raw / gzip bytes)

| Chunk | Before | After |
|---|---|---|
| `index` (entry, home and catalog) | 112063 / 33428 | 111198 / 33213 |
| `guidedExamples` (lesson content, lazy) | 1280349 / 324818 | 1254688 / 319096 |
| `graphFactories` (lazy) | 2068963 / 509850 | 2068874 / 509820 |

The entry chunk shrinks by 865 bytes. The lesson prose probe string occurs only in the `guidedExamples` chunk, not in `index`. The `guidedExamples` change comes from the parallel worker's content edits in the same worktree, not from this slice. `just build` runs typecheck first and that failed on the parallel worker's unfinished content migration, so `vite build` was run directly.

## Item 3: Demonstration resolved once

`App.tsx` no longer resolves the Demonstration or passes a title and description through `SiteContext.workspace` (field removed). `GraphHost` no longer reads `SiteContext`. `BaseGraph.getWorkspacePanels()` takes no context, `GraphPanelContext`, `workspaceTitle` and the panels' `title` are removed, and `BaseGraph.workspaceDescription()` is the only description default (graphs still override it). `DemonstrationWorkspace` already resolved the Demonstration for its other needs and now takes the heading from it (`"Bezeg"` when the route has no Demonstration, as before). The deviation from the wording of the task: the description default was kept in `BaseGraph` and removed from `App`, because descriptions are graph-specific (three graphs override them) and the Demonstration has no description field.

## Checks and mutation

See the slice report; unit logs are in `.claude/jobs/59614778/tmp/a10/`. Mutation: setting `lesson: false` on `bernstein` made `lessonCatalog.test.ts` fail 3 tests (the new derivation test, "adapts the foundation cohort", "every active demonstration route has an available lesson"); reverted, file identical to the saved copy.

## Slice 2 decisions

- Preview posters (D4): chose the Partial-record option over documenting regeneration. The generated map is `Partial<Record<DemonstrationId, string>>` (generator and validator in `tests/smoke-catalog.cjs` updated), `DemonstrationPreview` already renders an empty frame when `src` is undefined, and `src/demonstrationPreviewAssets.test.ts` fails naming missing/unknown ids plus `node scripts/capture-demonstration-previews.cjs`. Publish still validates full coverage. Motion assets (D5) needed nothing.
- Manifest (D7): moved from `src/images/demonstrations/catalog/` to `scripts/demonstration-previews/manifest.json` (capture evidence, read only by tooling). `encode()` now records `frames-<id>/%03d.png` and the output file name in the FFmpeg `arguments`; the 102 existing absolute paths were rewritten mechanically (no recapture). The publisher copies the manifest through `maps`, and `tests/smoke-catalog.cjs` reads the new path.
- Also fixed: `tests/smoke-catalog.cjs` parsed the removed `GUIDED_LESSON_AVAILABLE_IDS` literal; it now derives lesson availability from the definitions (`lesson: false` opt-out), matching slice 1.
- Regrouping content files by topic: deferred, not needed for acceptance.
