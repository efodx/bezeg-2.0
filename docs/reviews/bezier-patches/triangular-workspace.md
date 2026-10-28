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

## Task 08 acceptance (handlers 14–15, 2026-10-28)

Reviewed diff `45f6914..66efc0c` (08B1 inset, 08B2 selection/editor/weight, 08C tensor comparison) under the [acceptance brief](t08-acceptance-brief.md); repairs in `001c1bb` ([brief](t08r-brief.md)).

| Check | Result |
| --- | --- |
| R1 mathematics (Sonnet medium) | No defects: clamp, weight (`P_111` = 6/27 at the centroid), highlight families, shared tensor boundaries, localized claims; tests non-vacuous. Nits fixed in `001c1bb`: selection help now says "net lines with constant i, j or k"; the `triangleDomain.test.ts` "u + v above 1" claim dropped because the `min` guard is unreachable (`fl(fl(1−t)+t) ≤ 1`; no counterexample in 5·10⁷ random inputs) — guard kept as defensive. |
| R2 engineering + UI/a11y (Sonnet medium) | No blocking. E4 (medium, iso families and comparison by colour only) fixed: `SURFACE_DASH` in `threeSurfaceView.ts` — `iso` solid, `iso-v` dashed 0.03/0.02, `iso-w` short-dashed 0.014/0.014, `compare` long-dashed 0.07/0.03, as fractions of the scene's bounding-box diagonal; help strings name the patterns (sl+en). Observed mutation failures: `iso-v` solid (3), no `computeLineDistances` (1), constant dash size (1), untracked material (2). Low: contrast comment 5.2:1, both point editors labelled `P` with subscripts, compare domains note split into `patch_compare_domains` + `patch_compare_boundaries`. |
| E4 re-review (Haiku medium) | No findings. Its note on stale extent without a revision bump does not arise: a point move changes the net polylines and bumps the revision, and `rebuildGeometry` re-measures the extent. |
| R3 smoke (Sonnet medium) | [task08-smoke.md](task08-smoke.md): 5/5 checks, 0 console errors; inset clamping, index selection, weight, xyz apply, comparison transient across Presets, English, 390×844 touch. |
| Dash recheck (Haiku medium) | 7/7 pass on both patch routes, PNG export keeps dashes, `P₁₁₁`/`P₁₁` legends, 0 app console errors. `iso-w` dots (0.008/0.016) were faint; handler retuned to 0.014/0.014 and confirmed by screenshot (`.claude/scratch/smoke08r/c1-triangular-canvas.png`). |
| ADR0018 budgets (1440×1000, de Casteljau + split + comparison on) | Drag next-rAF p95 14,7 ms (≤ 60), orbit next-rAF p95 7,6 ms (≤ 16,7), active frame p95 16,7–16,8 ms (≤ 50), inset drag next-rAF p95 10,5 ms — pass. Measured before the dash change; dashed materials add only per-rebuild line distances on the affected roles. |
| `just check` at `001c1bb` | Passed, 4189 tests; build passed. |

Gaps, accepted: xyz text rejection not reachable in the browser (`type=number`; unit tests cover it); keyboard-only inset/select not exercised in the browser (unit tests cover keyboard paths); shared-boundary exactness judged by eye in the browser (unit tests to 1e-12); dashes not checked at 390×844 or in English. Deferred: S2 opening camera/framing to task 13; patch smoke-checklist rows to task 14. Observation not acted on: on the tensor inset a single pointer jump outside the board is not tracked (continuous moves clamp); not compared with `45f6914` yet — carried to the task 14 integrated smoke.
