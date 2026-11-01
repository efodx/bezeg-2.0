# 2. Figure export operation: evidence

Source task: [02-figure-export-operation.md](02-figure-export-operation.md). Recorded 2026-11-01 (platform stream, worker for A2) against base `3887af39`; uncommitted at the time of writing.

## Inventory before

- Export state in `BaseGraph`: `figureBatchActive`, `activeSingleFigureExports`, `reloadAfterExportPending`, derived `exportBusy`, and the same admission check and acquire/release written out in `saveAsSVG`, `saveAsPNG2` and `exportPresetFigures`.
- App-global lock in `src/localization/index.ts` (`exportsInProgress`, `exportFailed`, `beginFigureExport`, `reportFigureExportFailure`, guard in `setLanguage`), read through `useLanguage().exporting` by `SaveImage`, `PresetSelector` and `LanguageSelector`.
- Batch lock `activeOwnerBatches` (a `WeakSet` of session signals) in `PresetFigureBatch.ts`.
- Failure shown only in `LanguageSelector`.
- Tests reached into private members: `figureBatchActive` (Bisection, FixedPoint, Sequence), `activeSingleFigureExports` (GraphHost), and `beginFigureExport` from localization (BaseFunctionGraph, core). `GraphTransientState` tests held no private cast.

## After

`src/graphs/base/export/FigureExportOperation.ts` owns two distinct scopes.

- App scope: `beginAppFigureExport`, `reportFigureExportFailure`, `useFigureExportState`. It registers one language-lock predicate with localization.
- Graph scope: `FigureExportScope` (`busy`, `batchActive`, `runSingle`, `admitBatch`, `requestReload`, `teardown`) plus `claimSessionBatch` for the per-session batch claim.

Localization keeps only `registerLanguageLock` / `notifyLanguageLockChanged` and a `locked` flag from `useLanguage`. `SaveImage` and `PresetSelector` show the existing `figure_export_failed_try_again` alert beside their controls; `LanguageSelector` no longer shows it. No new message keys.

## Deletion test

- `BaseGraph` no longer knows the counters, the single-versus-batch rule, or when a deferred reload runs; `saveAsSVG` and `saveAsPNG2` are one `runSingle` call each.
- Localization no longer knows what an export is, how many are running, or that one failed.
- `PresetFigureBatch` no longer owns a lock set.
- Delete the module and exclusion, release, deferred reload and the language lock all reappear in four places.

## Mutation evidence (`FigureExportOperation.test.tsx`)

| Mutation | Result |
|---|---|
| Remove the busy guard in `admitBatch` | the batch/single exclusion test fails |
| Drop the generation bump in `teardown` | the teardown test fails (after strengthening it to assert no late render or reload) |
| Remove the reload call or its busy guard | the deferred-reload test fails |
| Language lock predicate always false | the language lock and the failure/state tests fail |

## Browser smoke (2026-11-01, handler 10)

Production preview of `d7e42cf0` (A2 as `24963b40`, before the final rebase onto `c0fc4292`), Playwright Chromium headless 1440×900, `bezeg-smoke` Haiku.

- SVG and PNG each fired a download on `/bezier/curve` and `/analysis/bisection` in Slovenian, and on `/bezier/curve` in English. The buttons sit in the "Shrani" / "Save" panel.
- Preset figure batch: produced `slike.zip`. During the run of about 1.4 s, `#bezeg-language` was disabled with "Med izvozom slike jezika ni mogoče zamenjati."; it re-enabled afterwards.
- "Izvoz slike ni uspel. Poskusi znova." was absent after every successful export. 0 console errors, 0 page errors.

## Not verified

A forced export failure in the browser (the failure alert is covered by unit tests only). The English batch. The lock window is short, so its timing was observed once.
