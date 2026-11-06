# 1. Foundation

Source: [shared graph controls](../../specs/shared-graph-controls.md), Order step 2, and [workstream 1](../../specs/lesson-authoring-architecture.md#1-shared-inspector-controls), where this spec does not change it. Depends on: task 0 confirmed by the owner.

## Work

Separate slices, in this order:

1. **Inputs and commit timing (C8, C17).** Workstream 1 inputs with decision 2: typed fields commit on Enter or blur; sliders, steppers and drags apply immediately. One keymap in `Slider`, `CountSetter` and `NumberInput`. Remove the unused `src/inputs/Select.tsx`.
2. **Unavailable and refusal protocol (C6, C7, C22, C23).** The `PlaybackButtons` model for unavailable controls, one notice channel that clears on accept, and one guard shared by inspector and lesson paths. Decisions 3, 7 and 8 define what is refused.
3. **Announcements (C21).** `LiveReadout` with one mute-during-Play rule and one marker that `controlsSignature` reads.
4. **Formats (C28).** `formatDegrees` and `formatScientific` in `src/analysis/format.ts`, in both languages.
5. **Fixture and lint.** The shared behaviour test (placement, limit, refusal, commit, Escape, keyboard, Reset). The lint rule fails on a raw input, range, select or stepper in graph code, with every current bypass on the exemption list. Add the shared-controls rule to the [family template](../feature-streams/README.md#family-template).

Provide the shared parts here; existing panels migrate in later tasks unless a slice needs a pilot.

## Acceptance

- Spec acceptance 7 holds, and 2 holds with the full exemption list.
- Each new control passes the fixture, and workstream 1's I1–I5 hold in both languages.
- A new raw control outside the exemption list fails lint, shown by an observed failure.
- Commit-timing changes keep lessons, Presets and synchronous multi-action scenes as they were, apart from the confirmed changes.

## Checks

`just unit <path>` while iterating; once per slice the full unit suite, `npx tsc --noEmit --pretty false` and the production build after localization changes. Smoke the migrated controls; run the full browser checklist if a slice changes the shared workspace or lesson runtime.
