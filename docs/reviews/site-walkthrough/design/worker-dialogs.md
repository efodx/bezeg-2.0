# Worker note: preset dialogs and batch trigger (handoff-v13)

Done, not committed.
- New `src/graphs/base/PresetFigureBatchDialog.tsx` (extracted ImageGenerationModal, wrapped in `.figure-batch`); rendered from `BaseGraph.workspaceSave` in the export group under SVG/PNG, only when `presetService` exists. `PresetSelector` lost the `batchExporter` prop and the figures block.
- Shared dialog style: `.bezeg-dialog` (class on both Modals) at the end of `WorkspaceControls.css`. Batch dialog footer is now outlined "Prekliči" (was "Zapri").
- `eslint.config.mjs:15`: the new file added to the raw-controls exemption (it holds the Form.Check list that was exempt in PresetSelector).
- Tests: `PresetDialogs.test.tsx` (class, focus inside, focus returns, both dialogs); move test in `TensorPatchExport.test.tsx`. Pre-change it failed: expected 'Prednastavitve v tem brskalniku' to be 'Izvoz slike'.
- Checks: unit (4 files) pass; typecheck pass; lint pass; build pass; smoke-built workflows.smoke.spec.cjs pass. No tests/*.cjs reference the batch or import dialog.
- Shots in docs/reviews/site-walkthrough/design/shots/: dialog-batch-1440/390, dialog-import-1440/390, panel-export-310, panel-export-1440.
- Not done: no surface-view smoke (the TensorPatch unit test still passes); dialog with preset rows ticked not screenshotted.
