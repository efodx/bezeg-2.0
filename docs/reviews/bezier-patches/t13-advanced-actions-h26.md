# Task 13 — advanced lesson actions handoff

Branch/worktree: `worktree-bezier-patches-r2` at `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\bezier-patches-r2`.

## Implemented

- Added closed lesson actions for join scene IDs (`join-c1`, `join-g1`, `join-c0-kink`, `join-teapot`), join modes (`c0`, `c1`, `g1`, with optional alpha), and the triangular graph's tensor comparison overlay.
- Registered join actions only in `TensorJoinGraph`; mode changes are unsupported while the teapot capstone is active. Alpha is validated as finite and within `[0.25, 4]` before state writes. Scene IDs map through the existing `joinStartingScenes` inventory and `useJoinScene`.
- Registered tensor comparison only in `TriangularPatchGraph`; its existing transient capture/restore owns the overlay state.
- Added mounted `GraphHost` tests for same-tick C0→C1→G1 actions, rendered join classification, teapot transition, dynamic unsupported actions, invalid alpha without mutation, comparison visibility, and exact checkpoint restoration of exported join state and drawn scene signatures.

## Evidence

- `just unit src/graphs/patches/patchLessonActions.test.tsx`: passed, 18 tests.
- `just typecheck`: passed.
- Regression mutation: temporarily removed `host.setAlpha(action.alpha)`; the targeted join lesson test failed at `joinAlpha` (`expected 3, received 2`). The implementation was restored and the full focused suite passed afterward.
- An initial test attempt compared full `SurfaceScene` JSON and failed because restore intentionally advances the revision. Assertions now compare `sceneSignature`, which excludes revision bookkeeping, while join preset data is compared exactly.
- No mathematical contradiction found. `joinReport()` classifies the resulting nets and confirms G1 with `alphaStar: 3`; the lesson action does not assert continuity from the selected mode alone.

## Integration

The remaining-examples author was given the exact action unions and is holding source writes for the handler's fullcheck checkpoint. The handler owns broader verification and browser review. Preserve concurrent authored edits in this worktree; no build, preview, commit, or Git operation was run here.
