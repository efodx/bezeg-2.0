# Bézier patches handler handoff 12 — 2026-10-28

Current entry point; supersedes [handoff 11](handler-handoff-11.md) for task 07 state (its Accepted section and Settings still apply). Objective unchanged: finish `docs/tasks/bezier-patches` tasks 07–14 in index order under AGENTS.md (standing authorization: delegation, commits, fast-forward master push).

## Successor rule (updated 2026-10-28)

Do not start or propose your successor yourself. At your context handoff, commit and push your handoff note, put its path and commit in your final message, and end your turn. The owner (or the session that started you) starts the next handler. Repeat this rule in your own handoff note.

## Git state

- `master` = `origin/master` = this note's commit. CI (Browser smoke) passed for `a9113ab` and `c30060d`.
- This commit carries task 07 docs only (capabilities, current-architecture, ui-functionality, commands; follow-ups appended to tasks 10 and 14).
- **Uncommitted WIP in the working tree (R2 repair slice, stopped mid-work by the owner; unverified, no typecheck/unit run):** `src/graphs/patches/surface-view/surfaceMath.ts` + `.test.ts` (F4 z-drag scale with fov/elevation), `threeSurfaceView.ts` + `.test.ts` (likely #8 publishFraming gating / #10), `TensorPatchPanels.tsx`, `TensorPatchEditing.test.tsx`, `src/localization/sl.ts`/`en.ts` (F6 `patch_bernstein_weight` → P notation). Review the diff, finish or discard; nothing of it is accepted.
- `debug.log` is pre-existing and unrelated; leave it.

## Remaining task 07 steps, in order

1. **R2 repairs** (Sonnet high, `bezeg-worker`; start from the WIP diff). Settled handler decisions:
   - A. F4: `zModeDrag` dz = dy·2·tan(fov/2)·d / (H·max(cos el, eps)) with real camera fov/elevation; bounded at the top preset; unit test at el=0 and top preset.
   - B. F6: keep scene label `P_{ij}` (lessons use `P_i`); panel text `patch_bernstein_weight` uses P with subscript indices (e.g. `P₁₂`), sl/en lockstep. Spec's `b_{ij}` stays as math notation.
   - C. #8: only recompute/set `data-surface-framing` when camera/framing inputs change; content identical for capture tooling.
   - D. #10: drag `start` skips `movePoint` when xyz is unchanged.
   - E. #11: darken control-point green `0x7d9d61` to ≥3:1 against the white clear colour; report the ratio.
   - F. #12: bounded timeouts for `SurfaceLabelOverlay.ready()` and the still path's `image.decode()`; test with never-resolving fakes.
   - G. Preset batch dialog (shared): list current Presets when opened; with nothing selected disable confirm or show an actionable localized message, never an empty zip.
   Each regression assertion needs an observed pre-fix failure. Then `just check`.
2. **R1b browser recheck** (bezeg-smoke, Haiku medium) — partial evidence from a stopped run against a `c30060d` build (scripts/logs were in a session scratchpad, not kept): host found; pinch on 390×844 touch emulation changed camera distance 17.37 → 4.34 (pass); a second pointer during a point drag stopped the drag but the point **stayed at the dragged position** (`b00` −1.5,−1.5 → −1.73,−2.75), it did not revert — decide whether "cancel" should restore the start position (docs now say "ends it"); the top-preset check timed out finding the `Zgoraj` button at mobile width (blocked, likely the panel is collapsed). Not run: role/description, degree elevate→lower round trip, hostile Preset import. Rerun these after R2 on a fresh build, plus a quick look at R2's visuals (green contrast, z-drag in top view, batch dialog).
3. Optional owner decision: full recapture to clear `mixedGraphSource` (now recorded as a task-14 note).
4. Docs: mark spec/task 07 complete; if R2 changes drag-cancel behaviour, update ui-functionality/capabilities ("A second pointer during a point drag ends it"). The docs worker flagged: no documented full-capture command (it wrote `node scripts/capture-demonstration-previews.cjs` without `PREVIEW_RECAPTURE_IDS` against a running `just preview` — verify); WebGL start failure and context loss share the `surface_unavailable` notice; keyboard on the view is arrows and `+`/`-` only.
5. Evaluation-log record for task 07 (subagent-flow-evaluation `do-log`): one compact record covering slices A, B, C1–C3, mutation slice, C2b (incl. its 135k handoff), reviews, R1a, R1b, and this handler's R2/recheck/docs workers (dispatch ~07:51 UTC; docs worker Sonnet medium, 47.5k tokens, 15 tool uses, accepted with two handler fixes: it had altered an unrelated line's stray CR in capabilities.md and overstated degree-lowering exactness). Commit, push master as a fast-forward, mirror to `origin/bezier-patches-wip`.

Then tasks 08–14 in index order (08 triangular workspace next).

## Settings

As handoff 11: handler Opus 5.5 auto mode; `bezeg-worker` Sonnet high for implementation, `bezeg-smoke` Haiku medium for narrow rechecks; watchers per docs/agent-workflow.md (self 150k/190k; workers 135k, Haiku 78k). Running three disjoint workers at once (recheck, src repairs, docs) worked without conflicts; keep src workers off `just build` while a smoke run uses `dist/`.
