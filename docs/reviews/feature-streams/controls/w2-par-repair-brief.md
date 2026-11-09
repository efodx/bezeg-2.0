# Wave 2 slice PAR: patches sweep review repairs

Read `w2-pa-common-brief.md` (role, shared files, test rules, checks). You are the only writer in `.claude/worktrees/stream-controls`. Do not commit. Findings: `w2-par.md` (review), `w2-pam.md` (mutation evidence), `w2-smoke-pa-a.md`, `w2-smoke-pa-b.md`, all in `docs/reviews/feature-streams/controls/`.

**Owned:** `src/graphs/patches/TensorJoinPanels.tsx`, `TensorSubdivisionPanels.tsx`, `TensorPatchPanels.tsx`, `CoonsPatchPanels.tsx`, `TensorDerivativesPanels.tsx`, the graphs behind them only if a repair needs it, their test files, the patch keys in `sl.ts`/`en.ts`.

**Repairs and acceptance:**
1. `TensorJoinPanels.tsx` derived-row note (`patch-join-derived-note`): `role="status"` → `role="note"` (it is the visible text of a discrete pick, as `patch-point-locked`). No `role="status"`/`aria-live` left in patch panels other than `RefusalNotice`/`LiveReadout` (grep).
2. Subdivision Elevate (decision 13): a blocked press announces the reason. Keep the visible reason lines; add the `PolygonAreaGraph.tsx:80-93` pattern (press counter, a `RefusalChannel` refused with the reason, `RefusalNotice`) wrapped in a `visually-hidden` container so the text is not shown twice. A test: pressing the unavailable Elevate puts the reason in the notice once; a second press re-announces (announcement key changes).
3. Tensor degree `CountSetter` (TensorPatch, also reused by Subdivision, DeCasteljau, Derivatives): give it the typed path (`onSet`) like Triangular and Join B, refusing out-of-range values in the field hint (decision 46). One wiring test: typing 3 + Enter sets the degree.
4. `joinSceneIndex` and the Join "custom" entry: add the missing test in `TensorJoinPanels.test.tsx` (after using a scene the select shows it with no custom option; after a B-point edit it shows custom; choosing the shown scene changes nothing). Show an observed failure by forcing `joinSceneIndex` to return undefined, then revert.
5. `TensorPatchPanels.test.tsx:40` `setDegree` helper: bound the loop (fail after at most 4 presses) so a stuck stepper fails instead of hanging.
6. Unused `LiveReadout` imports in `CoonsPatchPanels.tsx` and `TensorDerivativesPanels.tsx` (smoke A): remove if unused.

Low finding 3 (corner `<option aria-label>`) and 5 (`points={[xyz]}` identity) stay open; do not change them.

**Checks:** `just typecheck`; `just lint` on your files; `just unit` on the touched test files plus the patch lesson tests (common brief). Each new assertion: an observed failure by mutation, reverted; `git diff -- src` at the end contains only the repairs.

**Return** ≤250 words; evidence appended to `w2-par-repair.md`; handoff note `w2-par-repair-handoff.md`.
