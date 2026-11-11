# LP and Contour Preset round trip (worker note)

Suspicion confirmed for both graphs. Tests: `src/graphs/levelsets/LinearProgramPresetRoundTrip.test.tsx`, `ContourMapPresetRoundTrip.test.tsx` (save via `saveCurrentPreset`, select, Reset; plus an entry with no graphState).

Before the fix (observed):
- Saved Preset: refused on selection, notice `preset_entry_refused` (selection stayed '').
- LP, entry without graphState: 2 constraint rows instead of 3 (figure merge over the mount-time default).
- Contour, entry without graphState: exported data differed from the stored data (default state shown).

Fix: `LinearProgramGraph.tsx` and `ContourMapGraph.tsx`, next to `importPresetData`:
- `exportPreset()` overrides the base and stores `graphState: {initialized: true}` (the collection accepts only that).
- `figurePresetGraphState()` overlays `serialize*State(this.state)` (state written by the data import that precedes it).
- `savedGraphState()` is left alone: lesson checkpoints restore state over fresh initial state after the data import and need the full state.
- Collections and src/graphs/base untouched.

User impact: Presets saved before the fix (full graphState) stay refused on selection with the existing refusal notice; they must be re-saved. Files exported before the fix are refused on import the same way.

Checks: `just unit src/graphs/levelsets` passed; `just typecheck` passed; `just check-changed` not run (another run held the checkout lock, pid 11912).
