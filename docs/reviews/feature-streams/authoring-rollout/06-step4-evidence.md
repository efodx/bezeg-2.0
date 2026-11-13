# Task 06 step 4 evidence (handoff-v13)

Deleted: `src/graphs/graphFactories.ts` (git rm), `legacyDemonstrationRows` and its spread in `src/demonstrations.ts`, `isRegisteredDemonstrationId` and the legacy comment in `graphLoaders.ts`, the legacy branch in `Routes.tsx` graphRoute.
Kept: `registrationIntegrity.ts` `checkRegistrations(families, legacy)` signature (callers in 11 families pass an empty legacy input; unchanged to stay out of the Families-prep tests). `PresetImport.ts`, `guidedLessonOwnership.ts`, `chapterOwnedLessons.ts` held no legacy composition to remove.

Readers updated: Routes.test, DemonstrationsPage.test, graphCollectionIdentity.test (registered loaders only), registrationIntegrity.test (legacy section dropped; catalog equals registered rows), 17 registrationLoading tests (mock and forbidden regex), 31 registration*Composition/Deletion tests (central-file lists; per-family "legacy constructor table excludes" test removed), scripts/transient-state-scope.cjs (+test), check-changed-always-run.cjs comment.
Guard: `src/graphs/projective/registrationDeletion.test.ts` "the legacy constructor table stays deleted and no route imports it". Observed with a temporary src/graphs/graphFactories.ts: `AssertionError: expected true to be false` (test failed, 21 other passed); file removed, test passes.

Checks: tsc clean; node --test (ci-change-scope + transient-state-scope) 57/57; just unit over 231 files 228 passed, 3 skipped, 4419 tests passed; just build passed (first attempt discarded: inputs changed during the guard demo, rerun passed). Docs: current-architecture.md, capabilities.md, commands.md. Logs in .command-logs/.
