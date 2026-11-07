# Controls foundation slice 1a: commit rule and keymap

## Changes
- `src/inputs/NumberInput.tsx`: `applyOn` removed; the "confirm" behaviour is the only one. Typing (events with an `inputType`) only edits the draft; Enter or blur commits. Escape drops the draft. Non-typing changes (native spinner, test `fireEvent.change`) and arrow/Page steps still apply at once. New `bigStep` prop.
- `src/inputs/stepKeys.ts` (new): `stepKeyDelta`, `resolveBigStep`, `DEFAULT_BIG_STEP_COUNT = 10`. Arrow = step; Shift+arrow, PageUp, PageDown = big step (default 10 steps). `horizontal` adds Left/Right for the range input only.
- `Slider.tsx`: range `onKeyDown` handles Shift+arrow and Page keys, clamped to min/max; plain arrows stay native. `bigStep` prop, passed to its field.
- `CountSetter.tsx`: `bigStep` prop passed to its field (its keys live in the field).
- `Select.tsx` removed (search showed no importers).
- Consumer source: the redundant `applyOn="confirm"` removed in PointListInput, ValueListInput, ComplexMultiplicationGraph (2), LinearMapGraph (prop no longer exists).

## Consumer tests changed
- `ComplexMultiplicationGraph.test.ts`: dropped the three `props.applyOn` assertions.
- `NumberInput.test.tsx`, `Slider.test.tsx`: typed values now confirmed with Enter; `decimal entry` tests likewise.
- Other consumer tests use `fireEvent.change` (no `inputType`, applies at once) and are unchanged; PointListInput and the other `inputType` tests already used Enter.

## Mutation evidence
- `typing` branch disabled (per-keystroke commit back): 11 tests fail across NumberInput, CountSetter, PointListInput and Slider.
- Escape handler disabled: the Escape test fails.
- PageUp returning one step: CountSetter, NumberInput and Slider keymap tests fail.
