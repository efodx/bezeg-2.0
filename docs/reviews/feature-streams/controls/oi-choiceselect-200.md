# ChoiceSelect at 200 % text (handoff-v13)

Decision (handler): keep the native select (keyboard and touch as for any select); no custom listbox, no
`appearance: base-select`. When the selected option's text does not fit the closed select, ChoiceSelect shows the full
text as a line under it (`.inspector-help`, `data-choice-full`, `aria-hidden="true"`, the select already exposes its value).

Change
- `src/inputs/ChoiceSelect.tsx`: `selectedTextClipped` measures like the fixture's `findClipping` (canvas `measureText`
  of the selected option in the select's font > `clientWidth` - padding - 24 px arrow + 1). Re-measured in a layout effect on
  every render (value, option text, language) and by a `ResizeObserver` on the select (skipped when absent, JSDOM).
  Returns null when there is no 2D canvas context. No new localization keys; no CSS added (existing `.inspector-help`).
- `tests/controls-fixture.spec.cjs`: `SELECT_CLIP` exemption and `test.fail` removed. `findClipping` now skips the select
  clip only when its form holds a visible `[data-choice-full]` with the same text (that line is then measured as help
  text, so it must itself fit). New test asserts: no lines at 100 %, at 200 % >0 lines, each equal to the selected text and
  not clipped, no un-repeated select clip.
- `src/inputs/ChoiceSelect.test.tsx`: stubbed canvas and `clientWidth`; shown when clipped, hidden when fitting, follows
  value and option-text changes.

Results
- Before the component change (HEAD ChoiceSelect, new spec): 4 tests failed (text200 sl and en, main and new test), e.g.
  `inspector-edit: selected text is clipped (403 > 158): select.form-select "Prva možnost..."`.
- After: `just controls-fixture` passed (47 s). `just unit src/inputs/ChoiceSelect` passed. `just typecheck` passed.
- `just check-changed`: see report.

Gaps: no real-browser smoke beyond the fixture; the line stays on after a drag-resize only via ResizeObserver (not tested
in JSDOM).
