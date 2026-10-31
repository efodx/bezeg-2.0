# 10. Derived Demonstration and lesson registration

Status: implemented 2026-10-31 in `4fc59c6`; browser and production route checks pending (evidence in [10-derived-registration.evidence.md](10-derived-registration.evidence.md)). Lane: Learning; after test-consolidation tasks 1–3. Source: [specification §10](../../specs/architecture-deepening-backlog.md#10-derived-demonstration-and-lesson-registration).

## Scope and entry points

- `src/demonstrations.ts` and `graphs/graphFactories.ts`.
- `demonstrationPreviewAssets.ts` and `scripts/demonstration-preview-recipes.cjs`.
- `learning/runtime/lessonAvailability.ts:4-14`.
- `App.tsx:16-22`, `DemonstrationWorkspace.tsx:53` and `BaseGraph.tsx:403-404`.
- `src/images/demonstrations/catalog/manifest.json`.
- Smoke lesson rows.

## Implementation and acceptance

- Write a checklist of every place a new Demonstration and a new lesson must touch today. The task succeeds when that list shrinks, and when each remaining place is enforced by a failing build or test rather than by a comment.
- Derive lesson availability from authored content. Remove the hand-kept id list and the comments that tell authors to edit it.
- Resolve the current Demonstration once, so that its title and description reach the workspace without the round trip through BaseGraph.
- A missing preview asset fails a clear test rather than blocking typecheck of unrelated work, or the generated file documents how to regenerate it. Choose one and record it.
- Move the capture manifest out of `src` and strip machine-specific absolute paths. Optionally regroup content files by topic instead of rollout batch.
- Routes and stored Presets are unchanged.

## Verification

Run the catalog, routes, lesson availability and smoke coverage tests, typecheck, build, and the production route check. Do not edit the smoke file while test consolidation is still restructuring it.
