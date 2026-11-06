# 4. Remaining controls

Source: [shared graph controls](../../specs/shared-graph-controls.md), Order step 5. Depends on: task 3.

## Work

Separate slices:

1. **Reset and view (C9, C20).** Remove the local Reset buttons the owner confirmed in task 0. Host Fit with bounds through `fitView`, one view Reset label, one camera panel.
2. **Choosers (C10, C25, C26).** Examples are always a select with one `custom` rule (decision 4). Modes follow decision 9, and degrees decision 10.
3. **Display and sliders (C11, C13).** `OnOffSwitch`, one Reveal button, and `Slider` with an optional exact field.
4. **Playback (C12, C24).** `PlaybackButtons` everywhere, on the policy from contracts task 3, with one pause-on-edit rule. Write no second helper.
5. **Curve operations and readouts (C15, C27).** One operation panel; shared readout parts and a 1-based `StepCounter`.
6. **Labels and layout (C29, C30).** One key per shared meaning with `sl.ts` and `en.ts` in lockstep, following [choosing new terms](../../localization.md#choosing-new-terms). Move layout classes to their shared controls and drop the unused hooks.

## Acceptance

- All seven acceptance criteria in the spec hold, and the exemption list holds only confirmed exceptions.
- The spec's User impact records every Reset removal and visible change.
- `docs/` guidance on controls matches the result.

## Checks

Per slice as in task 3. Closeout: `just check`, the full browser checklist in both languages, and hosted CI after the push.
