# Wave 2 PAM: mutation evidence for the patches sweep (commit 3c4be65e)

Start: `git status --short -- src` empty. End: `git checkout -- src` (only my mutations), `git diff -- src` empty. Logs `.command-logs/w2-pam-*.log`. Each run was one test file via `just unit` (a nine-file batch run hung, see the finding).

| Assertion (file) | Mutation | Observed |
|---|---|---|
| Chooser none clears; Tensor and Join shapes (PatchPointChooser.test) | `onChange` gets `[]` instead of undefined for "none" | Tensor and Join cases failed; Coons and Triangular cases still passed (they never pick "none") |
| Editor 4 decimals (PatchPointEditor.test) | `decimals={2}` | "at most four decimals" failed |
| Editor Enter, blur, untouched axis exact | `onCommit` replaced by a no-op | Enter and blur tests failed (the exact-axis check lives in the Enter test) |
| Editor "as shown writes nothing" | no-op commit | passed (vacuous under this mutation; guarded by the shared field, not by the editor) |
| Editor empty draft refused | `NumberInput.tsx:173` `!Number.isFinite(typed)` to `false` (shared file, reverted) | empty-draft tests in PatchPointEditor and TensorPatchEditing failed |
| Camera preset, Reset, sliders (SurfaceCameraPanel.test) | Reset calls the "front" preset; azimuth slider writes "el"; elevation limit 90 | preset/Reset test and slider test failed (three mutations applied together, so not attributed one by one) |
| Starting select: shown entry does nothing (TensorPatchPanels) | removed `value !== shownPatch` guard | "shows custom ... choosing the shown entry does nothing" failed |
| `startingPatchIndex` net compare (TensorPatchGraph) | net comparison replaced by `true` | same custom-entry test failed |
| Degree `CountSetter` bound | `max={MAX_DEGREE + 1}` | "degrees step from 1 to 4" failed |
| Subdivision unavailable Elevate reason | `reason={undefined}` | "is unavailable (not disabled) at degree 4 with the reason" failed |
| Derivatives corner select | removed `value !== shown` guard | "shows the corner ... none entry ... shown corner changes nothing" failed |
| Derivatives LiveReadout | removed `<LiveReadout>` | collapsed-edge test failed (it awaits `[data-derivatives-live]`) |
| Coons `data-coons-live` | removed `<LiveReadout>` | "unlinking and moving d1's end point ..." failed |
| Triangular degree stepper | plus keeps the degree | degree stepper test failed |
| Triangular starting select | `startingPatchIndex` always undefined | starting-select test failed |
| Triangular camera | shared camera mutation above | camera test failed |
| `joinSceneIndex` / Join custom entry | `joinSceneIndex` always undefined (TensorJoinGraph) | NO assertion for it. One unrelated test failed ("a free row gets an editor ...") incidentally |

## Findings
1. Uncaught: `joinSceneIndex()` and the Join "custom" entry have no test. Needed: in TensorJoinPanels.test, after `useScene("join-g1")` the select value equals that scene index and has no custom option; after editing a B point the value is `custom` and the option shows `patch_join_scene_custom`; choosing the shown scene leaves the state identical.
2. The `setDegree` helper in `TensorPatchPanels.test.tsx:40` is `while (degree(label) !== target)`; with a stuck or overshooting stepper it never ends, so a regression hangs the suite (observed: more than 35 minutes of CPU) instead of failing. It should bound the loop. I could not kill the hung vitest worker (permission denied), so one orphan run may still be using CPU.
3. A Triangular/Coons-shape chooser case that selects "none" would make those shapes guard the clear; low value.

## Durations (clean tree, 12 touched patch test files, one `just unit`)
45.3 s total, 2 workers, all passed. Summed per-test times (only tests the reporter timed in ms, so lower bounds): TensorPatchEditing 8.6 s, TriangularPatchEditing 7.5 s, TriangularPatchGraph 4.4 s, TensorJoinPanels 3.5 s, TensorPatchPanels 2.7 s, TensorDerivativesGraph 2.6 s, TensorSubdivisionPanels 2.2 s, TensorDeCasteljauGraph 2.0 s, CoonsPatchGraph 0.9 s, PatchPointEditor 0.25 s, SurfaceCameraPanel 0.15 s, PatchPointChooser 0.04 s. Pre-change baseline is the handler's.


## Handler baseline

The 10 pre-existing touched patch test files took 37.3 s (Vitest 35.5 s) at master `6fad441f` in the clean worktree; after the sweep the 12 files (two new) took 45.3 s.
