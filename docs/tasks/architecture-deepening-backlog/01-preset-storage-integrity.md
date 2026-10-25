# 1. Preset storage integrity

Status: planned. Lane: Host. Source: [specification §1](../../specs/architecture-deepening-backlog.md#1-preset-storage-integrity).

## Scope and entry points

- `src/graphs/base/presets/Presets.ts`: `loadPresets` (54-62) and `exportAllPresetsToString` (36-46).
- Callers: `BaseGraph.tsx` at 289, 300, 318, 568-575 and 696, and `PresetSelector.tsx` at 27, 200 and 221-226.
- Reuse the family collection checks (ADR 0016) and the import envelope rules in `PresetImport.ts:39-54`.
- `NamespacedStorage` stays the storage adapter.

## Implementation and acceptance

- First write failing tests through the interface callers use:
  - malformed JSON in storage;
  - a wrong collection envelope;
  - denied storage access;
  - a failed write;
  - one corrupt key during backup export.
- Give the Preset storage module ownership of persisted collection integrity and of read/write outcomes. Callers must no longer need try/catch or shape assumptions.
- A corrupt collection never breaks the picker, save, delete, reload or backup. The learner sees an actionable message, and the raw rejected data stays recoverable: never silently delete it.
- Valid historical Presets and files keep loading unchanged.

## Verification

Run the Preset, import and BaseGraph tests, then typecheck and build. Do a focused browser check on one curve route and one function route, with a corrupted `preset-*` key in both languages.
