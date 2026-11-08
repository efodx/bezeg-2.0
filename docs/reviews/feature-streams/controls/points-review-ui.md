# UI and accessibility review, task 2 P2–P5 (2026-11-08)

Sonnet reviewer, static reading only (controls fixture and tests not run). Brief: [points-ui-review-brief.md](points-ui-review-brief.md).

## Findings

1. **Medium: focus lost after per-row remove.** `src/inputs/PointListInput.tsx:~101`: the remove button has no focus handling; rows are keyed by index, so removing one unmounts the last row and focus falls to `body`. Expected: focus the same index's remove button, else the previous row's, else the add control or count. The shared behaviour (`sharedControlBehaviour.tsx:315, 425`) does not assert focus after the press. → Wave 1 worker.
2. **Low: accessible name of selectable rows.** `PointListInput.tsx:~46` (`SelectablePointButton`) and `PointSetControls.tsx` segment/interval lists are named only by the label ("A", "s1"); the removed `pointset_select_*` strings said what pressing does. Expected: a name with the action (visually hidden text or `aria-label`). → Wave 1 worker.
3. **Low: duplicated reason.** `src/inputs/UnavailableButton.tsx`: `title` plus `aria-describedby` hidden span; some screen readers read it twice. Acceptable under decision 13; deferred to step 5.
4. **Low: `inputMode`.** `NumberInput.tsx:186` uses `text` for signed fields; mobile decimal keyboards lack a minus sign. Kept (deliberate trade-off).

## Passes

- `aria-pressed` bound to state for add mode, selectable rows and mode group; unavailable buttons use `aria-disabled` with a described reason and stay focusable. PointSet segment/interval Remove and Clear still use native `disabled` (pre-existing; compgeo sweep).
- The two status regions do not double-announce; the reason region is always mounted, keyed for repeat presses, cleared on count change, re-rendered on language switch.
- Typed-entry Enter rule: no double add, refused or unparseable drafts add nothing, labels and `aria-invalid`/`aria-describedby` present, blur and Enter share the commit path.
- Layout: flex-wrap rows; two axes plus a 44 px button fit in 310 px, the third wraps; 44 px targets on coarse pointers; forced-colors rule present.
- Localization: new strings in both catalogs, natural Slovenian; minor "Počisti" vs "Počisti vse točke" inconsistency, not blocking.

## Not verified (goes to smoke)

Rendered 310 px and large text; whether PointSet's `data-pointset-notice` and the collection reason region announce together on a refused add at the limit; actual focus after Clear all, board count change and typed commit; inspector width in the curve workspace.
