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
