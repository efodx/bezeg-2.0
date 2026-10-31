# Task 1 evidence: Preset storage integrity

Base revision cd73268 (working tree, uncommitted). Tests: `src/graphs/base/presets/Presets.test.ts`, describe "persisted collection integrity".

## Reproduced defects (tests run against the pre-change `Presets.ts`; 10 of 13 failed)

| Test | Observed pre-change failure |
| --- | --- |
| malformed JSON loads as empty with a problem, raw untouched | `SyntaxError` thrown by `loadPresets` (`JSON.parse`) |
| wrong shape: array, missing `data`, non-list `data`, Preset without a name, null Preset (5 cases) | no problem reported; `loadPresets().data` was `undefined`, `{}`, `[{data: []}]` or `[null]`, so callers would crash on `preset.id` |
| saving or deleting onto a corrupt collection is refused, raw kept | `SyntaxError` from the load inside `savePreset` |
| denied storage reads empty with a problem; writes and backup report it | read swallowed the error, returned `{data: []}` with no problem; `savePreset` threw |
| a failed write reports the quota problem, keeps the collection | `setItem` error propagated to the caller; no outcome |
| backup export skips a corrupt collection and names it | `SyntaxError`: one corrupt key aborted the whole backup |

## Deletion test: knowledge callers lose

- That reading storage can throw (`BaseGraph` mount and reload, `PresetSelector` list and batch picker no longer need try/catch).
- That stored JSON may be malformed or not `{data: Preset[]}`, and that every Preset has a text `id`.
- That a write can fail (quota or denied) and that a corrupt key must not be overwritten.
- That a backup must tolerate unreadable keys.
- Callers now only read `problem` on the outcome (`PresetsOutcome`) or `skipped` on `PresetBackup`.

## Behavior decisions

- Unreadable collection: the picker shows the default only, with an alert; save and delete are refused and the raw stored value is never changed. The learner can replace it by importing a backup file (the import dialog already asks before replacing a stored collection).
- Backup export leaves out unreadable collections, exports the rest, and names the skipped keys in the alert. If storage itself is denied, no file is written.
- Valid historical collections load unchanged: extra top-level fields are kept on save; blank or duplicate names still load as before.

## Verification

Commands: `just unit src/graphs/base/presets/Presets.test.ts` (before and after), `just unit src/graphs/base src/localization src/storage`, `just typecheck`, `just build`. Results are in the worker report.
