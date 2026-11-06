# 3. Family sweeps

Source: [shared graph controls](../../specs/shared-graph-controls.md), Order step 4. Depends on: task 2 and [contracts task 3](../mathematical-runtime-contracts/03-shared-trace-playback.md), which edits the same trace panels.

## Work

One sweep per family, in this order: compgeo, projective, functions, curves, patches. Each sweep moves the family's panels to the shared controls from tasks 1 and 2, applies the confirmed decisions, and removes its entries from the lint exemption list. Split a family into worker slices by panel, with one owner per shared file.

Before each sweep, read the family's rows in `inventory.md`. A control that turns out to need a new exception stops the sweep for the owner.

## Acceptance

- The family's exemptions are gone, apart from confirmed exceptions.
- Its panels pass the shared behaviour test where they offer a capability, and I1–I5 hold in both languages.
- Its lessons and Presets behave as before except for the confirmed changes. Mathematical meaning is unchanged.

## Checks

Per sweep: focused unit tests, the full unit suite once, a production build after localization changes, review under [review routing](../../agent-workflow.md#review-routing), and smoke of the family's affected routes. Add mathematical review where a sweep touches evaluation or constructions.
