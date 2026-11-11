# Open item: stored graph state type (worker note)

Type: `StoredGraphState = Partial<BaseGraphState>` in src/graphs/base/presets/Presets.ts, used by
`Preset.graphState`, `CheckedPreset.graphState`, `BaseGraph.figurePresetGraphState` and its 25 overrides
(compgeo, bspline, projective). Unused `BaseGraphState` imports dropped from 12 compgeo graphs.

- PresetImport.ts: the `as BaseGraphState` cast is gone; `isRecord(raw.graphState)` narrows after the existing
  check (a checked graphState is always a record, so behaviour is unchanged).
- A first attempt `Partial<BaseGraphState> & Record<string, unknown>` failed: interface `BaseGraphState` has no
  index signature, so full states were not assignable. Graph-specific fields are still read after `in` narrowing.
- Observed pre-change failure: removing only the cast gave TS2322 at PresetImport.ts(83,9)
  (`{} | null` not assignable to `BaseGraphState | undefined`), log .command-logs/tsc-pre.log.
  The new test's `graphState: {}` also cannot satisfy the old `Preset` type (requires `initialized`).
- Test: PresetImport.test.ts, "a stored Preset whose graphState lacks `initialized` still imports".
- Not touched: HermiteGraph.tsx; FivePointGraph.tsx only the signature line (+ type import).
- Checks: tsc clean; `just check-changed` log in .command-logs/oi-stored-check.log.
