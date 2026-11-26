# 08 visual followups (worker)

- Taylor: rows polynomial/function now bare names (`taylor_polynomial_name`, `taylor_function_name`) + symbols `T_n(x)`, `f(x)`. Old keys stay for the old panel.
- Phase portrait: declaration-only short keys `dynamics_*` in fragments/dynamics.ts; sentence moved to `readoutHelp` (`dynamics_readout_help`). Old panel unchanged.
- Parity taylor: fails (pre-existing for centre/degree/x too: recording labels "Središče c" vs declared name "Središče"; polynomial/function same). Not re-recorded.
- Parity phase-portrait: only `different` value rows (view, seeds, energy, ring, decision) plus one `extra note` (readoutHelp). Recording is of the old panel, so re-recording changes nothing; not re-recorded.
- PhasePortraitGraph.declaration.test.tsx: shortened rows assert shorter than the panel sentence instead of equality.
- No smoke locator matches the changed texts.

## Follow-up
- parity.ts: symbol-aware match (name + plainSymbol(symbol)), AcceptedDifference list (per Sample `accepted`, exact kind+where). Phase portrait lists 10 shortened rows + readout-help note. Unit tests added in parity.test.tsx.
- Declaration test asserts exact shortened values per state.
- Parity all ids pass except continuity (other worker); golden check passes except continuity.
