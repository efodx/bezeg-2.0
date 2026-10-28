# Task 08 evidence: triangular workspace

Evidence for [task 08](../../tasks/bezier-patches/08-triangular-workspace.md). Slices: 08A workspace core ([brief](t08a-brief.md), [worker handoff](t08a-handoff.md)), 08B, 08C. Review and smoke details for 08A are in [handler handoff 13](handler-handoff-13.md#08a-reviews-dispatched-0924-utc-e51792a0725bb5).

## 08A review dispositions (handler 14, 2026-10-28)

| Finding | Disposition |
| --- | --- |
| M1 + E2 (medium): DTO accepts `u + v <= 1 + 1e-9`, the kernel throws above `1 + 8·EPS` | Fixed. `stateFromDto` clamps `v` to `1 - u` (`TriangularPatchGraph.tsx`). Test `a checked import whose u + v exceeds 1 within the DTO tolerance is clamped into the triangle` imports `{u: 0.5, v: 0.5000000005}` through the collection check; before the fix it failed with `RangeError: Barycentric parameters must lie inside the reference triangle`, after it passes. The DTO tolerance is unchanged, so exported pairs that round above 1 still import. |
| M2 (low): chord tolerance cached by net identity | No change. The net is only replaced, never mutated: `movePoint` maps to a new array, `setDegree` stores `changeTriangularDegree`'s result, imports map the DTO. |
| E1 (low): unused optional `src` in `DemonstrationPreview` | Kept knowingly: tested and harmless. |
| E3 (low): `setSelectedCoordinates` without a control | Intended; 08B adds the numeric editor. |
| E4 (low, a11y): iso families distinguished by colour only | Carried to 08B UI work (dash pattern or legend). |
| S1 (low): an out-of-range typed `u` stays in the field | No change. The shared `NumberInput` keeps the draft while focused, shows the range hint (`number_range_hint`, role `status`) and reverts on blur (`NumberInput.test.tsx` "a value outside the range … is explained"). The smoke script pressed Enter and did not read the hint. |
| S2 (low): opening camera distance 15.68 vs 7.37 after reset | Deferred to task 13 (framing). The authored cameras are fitted to a 390×844 portrait host by design, shared with the tensor workspace (`patchPresetCollections.ts`: "wider hosts only see more margin"). Fitting on first open needs a mount hook in `BaseGraph` that runs after host layout and must not override Presets, lessons or figures; that is a cross-workspace camera policy, not an 08A defect. |
