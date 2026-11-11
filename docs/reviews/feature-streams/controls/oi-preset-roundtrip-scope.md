# Preset round trip scope (handoff)

Scoped `src/graphs/PresetRoundTrip.contract.test.tsx` like the other catalog sweeps.

- Registration: `scripts/transient-state-scope.cjs` (`SWEEPS.presetRoundTrip`, variable `BEZEG_PRESET_ROUNDTRIP`,
  `PRESET_SHARED_PATHS` = `SHARED_PATHS` + `functionPresetCollections.ts`), `vite.config.mts` (provide + type),
  `src/graphs/base/catalogSweepScope.ts` (`presetRoundTripScope` type; outside the owned list, registration lines only).
- Preset code under `src/graphs/base/` is already shared. `src/storage/` left out: the contract does not use appStorage.
- Test: ids = factory keys + 3 unrouted. Sample = `familySample(TRANSIENT_STATE_SAMPLE + patch-coons)` + unrouted
  = 25 graphs. A changed graph class file adds its graph (`classNames`), unrouted ones included. Full set in CI,
  `BEZEG_SWEEPS=all`, `BEZEG_PRESET_ROUNDTRIP=all`.
- Observed: sample 25 passed + 1 skipped placeholder, 22.8 s; `=all` 121 passed, 75.7 s. Default run on this branch ran
  all 121 because the branch changes shared files (`catalogSweepScope.ts`, `vite.config.mts`); use `=sample` to see the sample.
- Tests: 2 new in `scripts/transient-state-scope.test.cjs`. Before: registration removed -> TypeError (undefined sweep);
  functionPresetCollections pattern removed -> shared-change test fails.
- Docs: `docs/commands.md` "Catalog sweep scope".
