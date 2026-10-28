# Task 09 evidence: constructions and derivatives

Evidence for [task 09](../../tasks/bezier-patches/09-construction-derivatives.md). Slices: 09A `patch-decasteljau` ([brief](t09a-brief.md), [worker handoff](t09a-handoff.md); two Sonnet-high workers — the first hit 135k at 50 turns, the second finished in 31 tool uses), 09B1 pure differentials ([brief](t09b1-brief.md); one Sonnet-high worker, 15 tool uses), 09B2 `patch-derivatives` route ([brief](t09b2-brief.md)). Commits: `86d6b9f` (09B1), `da0dbf2` (09A); handler `just check` on that tree 4387 tests passed.

## Reviews of `0e59092..da0dbf2` (Sonnet medium, read-only, dispatched 16:49 UTC)

**Mathematics — no high/medium.** Verified: `columnsFirstScheme` recurrence and levels; construction staging for rows/columns (stage 1 = interior levels of each line, stage 2 = line results to the level before `S`) and bilinear (`min(m,n)` reductions, remainder as stage 2, none for square nets); collision-free marker ids; partials/twist/normal orientation; collapsed edge gives exactly zero `S_v`; tolerance misclassifies a regular point only when `|S_u||S_v| sinθ < 1e-9·D²` (practically degenerate; rounding ≈ 1e-14·D²); shared drawing scale truthful, tangent quad planar; four corner identities incl. signs; both degenerate nets as claimed, and a limit normal exists along the collapsed edge (`S_u × S_uv` has z-component 3). Low findings, to repair:

- M1 `tensorDerivatives.test.ts` "nearly parallel but distinct tangents" is vacuous: the corner tangents are perpendicular, the tilt only changes the twist. Use a genuinely near-parallel pair (sinθ ≈ 1e-4) so an absolute or wrong cross tolerance fails it.
- M2 the collapsed-edge test only asserts `kind === "defined"` at `u = 1e-4`; assert the normal approaches the unit `S_u × S_uv` at `u = 0` (the help text's limit-normal claim).
- M3 the scene test checks polyline roles/ids, not their points; compare polyline points with the independent recurrence too.

**Engineering + UI/a11y — no high/medium.** Verified: `patch-tensor` state/Presets/panels unchanged by the new hooks; `construction-2` material tracked once per view; hidden construction adds no objects; Reset/Preset/old-file paths; bad order rejected with the localized reason; assertions depend on the change (revision-bump test covers `FakeSurfaceView` ignoring revision); sl/en lockstep. Low findings:

- E1 `patchDto.ts:45` shared `PATCH_STATE_FIELDS` lets tensor/triangular files carry `decasteljauOrder` (validated, ignored; same as `showDeCasteljau`). Decide: keep and document in capabilities, or per-collection field lists.
- E2 `construction-2` (0xb02a73, 6.13:1 on white) vs `construction` (0xc45f3b) is 1.47:1 between them; lines differ by dash, but **markers** differ only by hue. Give stage-2 markers a different size or shape. Repair before smoke.
- E3 catalog card reuses the `patch-tensor` poster (`demonstrationPreviewAssets.ts:80`) — interim until task 13; acceptable, record it.
- E4 `useStartingPatch` sets state twice (base import, then construction fields) — transient re-render; fold into one write if cheap.

## 09A/B1 low findings — dispositions (handler 16)

- M1–M3 fixed by 09C-Y ([brief](t09c-brief.md)): near-parallel pair at sin θ ≈ 1e-4 across scales; collapsed-edge normal converges to unit `S_u × S_uv` as `u → 0`; de Casteljau polylines compared point by point with an independent recurrence for all three orders, m, n ∈ 1..4. Observed failures: three cross-tolerance mutations, reversed and shifted polylines.
- E1 decided: keep one shared `PATCH_STATE_FIELDS`; route fields in other files are validated and ignored, documented in [capabilities](../../capabilities.md#patch-constructions-and-derivatives).
- E2 fixed by 09C-X: `construction-2` markers are octahedra at 1.25 × the point radius; spheres elsewhere. Observed failure with the distinction removed.
- E3 recorded: both routes reuse the `patch-tensor` poster until task 13.
- E4 fixed by 09C-Y: one `setState` through the protected `startingPatchKept()`; "writes once" tests observed failing with two writes.

## 09B2 reviews (handler 16)

Engineering + UI/a11y (Sonnet medium, [report](t09b2-review-eng.md)), no high:
- Medium, readout at the end of Uredi: fixed, it now sits under the corner buttons in the point group.
- Medium, `S_u`/`S_v` both solid: kept as the brief allowed (blue `0x0b4f9c` vs crimson `0xb3202a`, strong hue and luminance difference, each with a tip label; the legend names both).
- Medium, vacuous `showTwist` rejection test: now asserts the `invalid_option` reason and not `unknown_patch_field`; observed 4 failures with `showTwist` removed from the field list.
- Low: orphaned JSDoc fixed. Deferred: scene extent ignores planes (the quad is at most the display length around a surface point); corner-button label-in-name (visible "(0, 0)" is part of the accessible name); legend plain text vs `<var>` readout. Fine twist dots go to the smoke check.

Mathematics (Sonnet medium, [report](t09b2-review-math.md)): arrows, common scale, quad in the plane, omission rules and reason texts correct.
- Medium, parallel-corner limit normal: at `(0, 0)` of that Preset the approached normal depends on direction, so no limit normal exists. Fixed: the parallel status text (sl/en) now says the normal may tend to a limit or depend on the direction of approach; the prompt asks where each happens; the Preset comment says no limit exists there.
- Low, tolerance-zero tangent still drawn: fixed, the scene omits an arrow the classifier reports as zero; regression test observed failing without the fix.
- Test gap, quad span: new test that the quad edges are parallel to `S_u` and `S_v` and centred at `S(u, v)`. Readout corner identities were already tested (`TensorDerivativesGraph.test.tsx:72`).
- Low, sliver quad for very unequal `S_u`, `S_v`: accepted; it shows the true ratio.

## Smoke and handler browser checks

- First-pass smoke (`bezeg-smoke` Sonnet medium, [task09-smoke.md](task09-smoke.md)): all checks passed, 0 console errors on `/patches/decasteljau`, `/patches/derivatives` and `/patches/tensor`. Its preview reused the build from handler `just check` (labelled `c1ecbf1` dirty); that build ran after the last source edit, so its sources equal `7447559`.
- Twist dots read faint: handler retuned `twist` 0.008/0.010 → 0.012/0.012 (still shorter than `iso-w`, order test unchanged) and confirmed by screenshot from below the dome (`.claude/scratch/smoke09/h16-twist-below.png`). On the default dome the twist points into the surface and is occluded; its short length on that Preset keeps it subtle.
- Handler focused check on the rebuilt preview (`7447559` + retune): keyboard orbit changes the rendering on both routes; SVG export holds the rendered image plus vector labels (1 on `patch-decasteljau`, 4 on `patch-derivatives`); PNG downloads; 0 console errors.

## Acceptance (handler 16)

| Criterion | Evidence |
|---|---|
| Independent numerical checks bind rendered construction points/vectors to geometry | De Casteljau polylines compared point by point with an independent recurrence for all orders and m, n ∈ 1..4 (M3); arrow polylines equal `drawDifferentials`, directions equal `partialU/partialV/twist`; quad in the plane, spanned by `S_u`, `S_v`, centred at `S(u, v)`; readout corner identities `S_u(0,0) = m(P_10 − P_00)` etc. |
| Mode switch, Reset, Presets, scene actions, language keep values in sync | Graph tests on both routes (order/switches through Reset and Preset restore, `startingPatchKept` single write, language relabel); smoke 1a–1e, 2c–2f. |
| Keyboard/touch paths and exports usable | Keyboard orbit and SVG/PNG export observed on both routes (handler check); 390×844 in smoke; corner buttons and order select are native controls. Touch drag on these routes inherits the tensor workspace path (not re-exercised: gap, shared code unchanged). |
| Hidden constructions disposed | Plane mesh/outline/material disposal and rebuild-without-leak tests; switches remove scene objects (graph tests, smoke 2d). |
| Route metadata, prompts, initial scenes | Two prompts per route, default scenes (dome at `(0.3, 0.65)`), placeholder lesson sections for task 12, interim posters for task 13. |
| Degenerate normal explained and handled | Status per reason, no plane/normal, tolerance-zero arrows omitted; parallel-corner wording corrected after math review. |
| Gesture budgets (ADR 0018) | Software GL, 1440×1000: drag next-rAF p95 8,0–9,3 ms (≤ 60), orbit next-rAF p95 5,1–5,7 ms (≤ 16,7), drag frame p95 ≈ 33 ms (≤ 50). |
| `just check` | 4494 tests passed on the integrated tree (sources = `7447559`); view tests 51/51 after the twist retune. |

Deferred with impact: label overlap of `n` and `S(u, v)` at some orbit angles (task 13 framing/labels); real posters (task 13); patch smoke-checklist rows and a real-GPU look at the twist dots (task 14).
