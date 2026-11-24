# Task 06 slice 1 (worker note)

Done: preview/paths.ts, preview/previewGeometry.ts, `previewable` marks, `checkDeclaration(declaration, hasPreviewGeometry?)`, BaseGraph `previewGeometry()`/`getPreviewGeometry()`, phase portrait `phasePortraitPreview.ts` + `phase-a` previewable, tests (phasePortraitPreview.test.tsx, graphDeclaration.test.ts), experiment code, fixtures/preview, scripts/preview-measure, justfile recipe and docs/commands.md line removed.

Checks: just unit (4 files) 46 passed, 9 skipped (pre-existing skips); tsc 0 errors; lint passed. Deliberate breaks (field B, a write inside the preview, disabled check) failed the 3 new assertions, restored.

Open: declarationContract.test.tsx:60 (all-graph, untouched) should pass `graph.getPreviewGeometry() !== undefined` as the second argument; until then the mark is checked only where a test passes it (the phase portrait declaration test does).
