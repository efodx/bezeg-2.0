# Wave 2 common brief (handoff-v13): learning playground sweep

Applies to the learning slice briefs (`w2-le1-brief.md`, `w2-le2-brief.md`). Read `w2-pa-common-brief.md` in this folder for the sections *Role*, *Phase 5 test rules*, *Shared files*, *Checks* and *Budget and return*; they apply unchanged, with these differences:

- **Family:** the learning playgrounds under `src/learning/playground/` (no graph `BaseGraph`, no host Reset or Fit). Run the playground tests beside your files and `src/learning/playground/**` tests you touch; the patch lesson tests do not apply.
- **Lint:** do not edit `eslint.config.mjs`. The `controlExemptions` entry lists both `CollisionPlayground.tsx` and `LookUnderneath.tsx`; the handler removes it at integration. Run `just lint <your files>` (the exemption still hides the raw-control rule there) and also report the raw `input`/`select` count left in your files (`grep -c "<input\|<select"`), which must be 0.
- **Localization keys:** add next to the existing `playground_*` / `collision_*` keys.

## Goal and source

[Task 3, family sweeps](../../../tasks/shared-graph-controls/03-family-sweeps.md) for the learning playgrounds: move them to the shared controls in `src/inputs/` and `src/graphs/base/controls/` (`OnOffSwitch`/`BooleanField`, `ChoiceSelect`, `UnavailableButton`, `RefusalChannel`/`RefusalNotice`, `LiveReadout`). Spec `docs/specs/shared-graph-controls.md`: *Capability catalogue*, *Owner decisions* 9 (modes are a `ChoiceSelect`; board tools stay a pressed group), *Delegated decisions* 13, 18, 41, 47, 50–54 (latest precedents). Inventory: `docs/tasks/shared-graph-controls/inventory.md` rows "Drawing playground" and "Look underneath" (CollisionPlayground has no row yet: write one in your evidence file in the same column format).

## Out of scope (step 5)

Own playback rows and their buttons (C12: Play, Pause, Step once, speed) and readout styling (C27): leave them, but a natively `disabled` playback button may stay only if it is part of such a row; say which. Canvas, worker and drawing logic are unchanged.

## Acceptance

1. No raw `input`/`select` left in your files; no native `disabled` without a reason outside a C12 playback row (decision 13: `UnavailableButton` with a reason, announced on a blocked press through a `RefusalNotice` as in `src/graphs/compgeo/PolygonAreaGraph.tsx:80-93`).
2. Mode radio groups and the overlay choice become `ChoiceSelect` (decision 9) unless the control is a board tool that must stay visible as a pressed group; checkboxes become `OnOffSwitch`. One live region per playground through `LiveReadout` (decision 18; muted while a run plays where there is Play). I1–I5 hold in Slovenian and English.
3. Behaviour and lessons that embed the playground are unchanged apart from the control kind; lesson text quoting a changed control is updated and listed.
