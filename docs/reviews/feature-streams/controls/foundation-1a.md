# Controls foundation slice 1a: commit rule and keymap

## Changes
- `src/inputs/NumberInput.tsx`: `applyOn` removed; the "confirm" behaviour is the only one. Every change only edits the draft; Enter or blur commits. Escape drops the draft. Arrow and Page steps apply at once. New `bigStep` prop.
- `src/inputs/stepKeys.ts` (new): `stepKeyDelta`, `resolveBigStep`, `DEFAULT_BIG_STEP_COUNT = 10`. Arrow = step; Shift+arrow, PageUp, PageDown = big step (default 10 steps). `horizontal` adds Left/Right for the range input only.
- `Slider.tsx`: range `onKeyDown` handles Shift+arrow and Page keys, clamped to min/max; plain arrows stay native. `bigStep` prop, passed to its field.
- `CountSetter.tsx`: `bigStep` prop passed to its field (its keys live in the field).
- `Select.tsx` removed (search showed no importers).
- Consumer source: the redundant `applyOn="confirm"` removed in PointListInput, ValueListInput, ComplexMultiplicationGraph (2), LinearMapGraph (prop no longer exists).

## Consumer tests changed
- `ComplexMultiplicationGraph.test.ts`: dropped the three `props.applyOn` assertions.
- `NumberInput.test.tsx`, `Slider.test.tsx`: typed values now confirmed with Enter; `decimal entry` tests likewise.
- Other consumer tests enter values through `src/inputs/testEntry.ts`, which types and then presses Enter or blurs; only a non-text element such as a range still uses `fireEvent.change`.

## Mutation evidence
- `typing` branch disabled (per-keystroke commit back): 11 tests fail across NumberInput, CountSetter, PointListInput and Slider.
- Escape handler disabled: the Escape test fails.
- PageUp returning one step: CountSetter, NumberInput and Slider keymap tests fail.

## Review decisions

- **Retyping the shown text writes nothing.** With a model of 1.234 shown as 1,23, typing 1,23 leaves the model at 1.234 (`confirmDraft`). Kept: the field looks the same either way, and writing would change the model with nothing on screen to explain it. Rejected: committing any edited draft, which also rounds the model when a user types and then restores the text.
- **A draft in a field disabled or unmounted while focused is lost.** The review found no caller that does this. Carried to task 1 slice 2, which owns unavailable controls.
- **A draft that is not a number is now explained.** Enter on `-` or `abc` did nothing and blur reverted silently, which matters now that Enter or blur is the only commit. `confirmDraft` sets an `invalid` hint: the range hint when the field has limits, otherwise the general one, never a field's model-refusal text. Typing alone still shows no hint. Both new tests failed before the fix. The incomplete-draft test had become an Enter test in the 1a rewrite; it types again, as it did before 1a.
- **Carried to slice 1b:** `inputMode="decimal"` on fields with negative limits, because iOS decimal keypads may have no minus sign (it predates 1a; unverified on a device), and whether an open draft needs `aria-valuetext`. `aria-valuenow` stays the committed value; no screen reader has been run.
