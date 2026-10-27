# Mutation evidence brief (handoff-v12) — C1b graph tests and C2a

- **Role:** review worker running deliberate mutations; you may edit source files **only temporarily** and must restore each file exactly (`git diff --stat` at the end must equal the starting `git diff --stat`, which you record first to `.command-logs/mut-start.txt`). No commits, no other edits, preserve `debug.log`.
- **Goal:** for each mutation below, apply it, run the named test file(s) with `npx vitest run <files> > .command-logs/mut-<n>.log 2>&1`, record whether at least one test failed and which test name, then restore. A mutation that leaves all tests green is a finding (vacuous or missing assertion).
- **Mutations** (files under `src/graphs/patches/` unless noted; locate with grep):
  C1b graph tests (`TensorPatchGraph.test.tsx`):
  1. `TensorPatchGraph.tsx` `movePoint`: write the old position instead of the new one (point move).
  2. Camera edit path in `BaseSurfaceGraph.tsx`: bump the geometry revision on a camera edit (camera no-bump).
  3. `setDegree` raise branch: replace exact `elevate` with resampling (or return the unchanged net) (raise exact).
  4. `setDegree` lower branch: perturb a corner (e.g. add 0.1 to the first control point's z) (lower keeps corners).
  5. `exportPresetData`: omit `camera` (export round-trip).
  6. View dispose in `BaseSurfaceGraph.tsx`: call `view.dispose()` twice or skip it (single dispose).
  7. Attach rejection handling in `BaseSurfaceGraph.tsx`: swallow nothing / remove the rejection handler (attach rejection).
  C2a (`TensorPatchEditing.test.tsx`, `patchSceneBuilder.test.ts`, `src/graphs/base/GraphSession.test.ts`):
  8. `patchSceneBuilder.ts`: drop the `highlight-col` push.
  9. `patchBernstein.ts`: omit the binomial coefficient.
  10. `TensorPatchGraph.tsx`: remove the inset `point.on("drag", …)` handler body's `setParameters` call.
  11. `GraphSession.ts` `createAuxiliaryBoard`: skip `freeBoard` in `release`.
  12. `TensorPatchGraph.tsx`: make `syncInset()` a no-op.
  13. `BaseSurfaceGraph.tsx` `selectPoint`: drop the `revision++`.
  14. `setCameraAngle`: use `degrees` directly as radians.
  15. Panels: `setSelectedCoordinates` accepts a non-finite value (remove the finite check in the editor submit in `TensorPatchPanels.tsx`).
- **Return:** ≤200 words: a table `n | killed? | failing test name`, any survivors with `file:line` of the assertion that should have caught it, and confirmation that the final `git diff --stat` matches the start. Write the full table to `docs/reviews/bezier-patches/c2-mutations.md`.
- **Budget:** ≤20 turns; batch several mutations per shell command (apply with a small node/sed script, run, `git checkout`-style restore is NOT allowed because files carry uncommitted work — restore by reversing your own edit, e.g. copy the file to `.command-logs/mut-backup/` first and copy it back). Read ≤150 lines per call. On `HANDOFF`, restore all files, write the partial table, return.
