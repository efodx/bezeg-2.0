# Wave 2 LE2 evidence: look underneath and drawing playground

Files: `src/learning/playground/{DrawingPlayground.tsx,.css,.test.tsx,LookUnderneath.tsx,.test.tsx}`, `sl.ts`/`en.ts` (11 new `playground_*` keys after `playground_joins_legend`).

## Changes
- Drawing playground: Undo, Redo, Clear, Add point, Close, Delete point and the three anchor-type buttons are `UnavailableButton` with reasons (add and close have two reasons each); one `RefusalChannel` per playground (cleared on any accepted edit via `setHistory`), one `RefusalNotice` under the toolbar. The anchor-type group stays a pressed group (decision 9). Load example is never unavailable. Summary is a `SettledReadout` + `LiveReadout` (`replace`, so it publishes at once; the 500 ms debounce of the announcement is unchanged). The channel is exposed as `PlaygroundOverlayContext.refusal`.
- Look underneath: four `OnOffSwitch`; Previous/Next `UnavailableButton` (first/last/no segments) reporting to the shared channel.
- CSS: native `:disabled` rules became `[aria-disabled='true']`; `.playground__live` removed (LiveReadout is visually hidden); `.lu-switches` checkbox-box overrides removed so the switch draws itself.
- Status regions per playground: 2 (summary + refusal), was 1; the LookUnderneath test now asserts 2.
- Not changed: keys (C16), canvas/drawing logic, no playback rows (C12 none here). Native `disabled` left: 0. No lesson text quotes the changed controls.

## Checks (observed)
- `just unit src/learning/playground`: passed (9.8 s); the two files: 63 tests passed, 2.4 s (before: not measured).
- `just typecheck` passed; `just lint` on the 4 files passed; raw `<input|<select` count 0 in both.
- Mutations (observed failures): Undo as native `disabled`: 3 DrawingPlayground tests fail; Previous as native `disabled` + switch as checkbox variant: 2 LookUnderneath tests fail; anchor-type buttons without reason: 2 DrawingPlayground tests fail. Restored.
- Existing assertions adapted: `.disabled` -> `aria-disabled`; live text now ends with "." (SettledReadout normalises).

## Not verified
Browser smoke, visual check of switch layout in `.lu-switches`, English reason wording review, test-time delta before (no baseline run).
