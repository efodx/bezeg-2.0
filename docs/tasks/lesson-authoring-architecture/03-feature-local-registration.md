# 3. Feature-local registration (projective conics pilot)

Status: implemented 2026-11-10 (slices 1-3: commits cdef00d6, 9886724a, and slice 3 pending commit); closeout pending: smoke and engineering review. Task file written 2026-11-08 by the Controls stream (step 9 of [controls.md](../feature-streams/controls.md)). Source: [lesson-authoring architecture, section 3](../../specs/lesson-authoring-architecture.md#3-feature-local-registration), acceptance R1–R5 (canonical there), plus [verification](../../specs/lesson-authoring-architecture.md#verification-and-completion-evidence). Starts after task 5 (whose collection definitions it references) and consumes task 2's owner identities ([02-lesson-lookup](02-lesson-lookup.md)). Projective conics only, then stop.

## Scope and entry points

`Routes.tsx`, `demonstrations.ts`, `lessonAvailability.ts`, `graphFactories.ts`, `PresetImport.ts` collection composition, `src/learning/content/chapterOwnedLessons.ts` (`chapterOwnerRows()`, read only; a new registry must not import it or `runtime/lessonCatalog.ts`, guarded by `lessonOwnerIntegrity.test.ts` and `lessonImportGraph.test.ts`), and the preview generator/capture tooling with its Vite `ssrLoadModule` bridge. Reconcile against current `master` first.

## Slices

1. **Metadata and runtime surfaces.** Cheap typed metadata (catalog/route identity, lesson intent, owner identities, explicit order) and runtime composition (lazy loaders, collection references) for the five projective graphs; root composes typed indexes; `DemonstrationId` derived, not widened to `string`; a disjointness check against legacy composition; a projective route no longer loads the all-graph table (R1, R2, R3). Observe module evaluation.
2. **Tooling surface.** Inventory and capture consume the shared destination identities; delete duplicated projective route/section lists and derivable primary-navigation rows (R4).
3. **Contributor example and deletion test** (R5); update architecture and contributor guidance.

## Verification

Focused `just unit` paths from the spec's registration row and the preview tooling Node suites (`just tooling-test` and the generator's own runner), `just typecheck`, `just lint`, `just build`, then `just check`. Smoke: production route and asset checks with direct links, refresh, query/hash and unknown routes, plus preview-tool checks. Engineering review of the diff.
