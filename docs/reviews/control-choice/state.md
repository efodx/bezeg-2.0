# Control choice: handler state note

Written by handler 3 on 2026-11-14 at the end of the queue. **The queue is complete; no successor was started.** Queue and close-out: [task queue](../../tasks/control-choice/README.md#close-out). Spec: [control choice and composition](../../specs/control-choice-and-composition.md). Findings, closing sweep and open items: [findings.md](findings.md). Catalogue: [docs/controls.md](../../controls.md).

## Where things are

- Worktree `.claude/worktrees/stream-control-choice`, branch `worktree-stream-control-choice`.
- On `master` since `f2728b2a`: the migration slices 2g-c to 2i, steps 4a to 4c, the sweep detector fixes.
- Published after it: step 4d (`NumberGrid`), step 4e (catalogue pictures), the close-out (empty status group, findings, queue, defect images, this note). `just publish --status` and `git log origin/master` show whether that second publish landed; if `git log --oneline origin/master..HEAD` on this branch is not empty, it did not, and the remaining step is to publish those commits (full `just smoke` passed on them before the gate started).

## What is left, none of it queued

A later task picks these up; each is described in the findings or the queue.

1. **Recapture after renaming.** Six clip rows (`euler-method`, `complex-reciprocal`, `complex-roots`, `projective-pole-polar`, `projective-five-point`, `projective-cross-ratio`) address controls by labels that the migration changed, and `complex-multiplication`'s motion restore uses the new names. Five overlay labels (`notable_overlay_*`, `euler_overlay_ninepoints`) stay long because the posters of `triangle-centres` and `euler-line` were captured through them. The capture (`just clip`, `scripts/capture-demonstration-previews.cjs`) refuses to run while `complex-euler`, `complex-power`, `contour-map`, `recursion-cobweb` and `solids` have no recipe (families-prep F5 media). Once it runs: rename, recapture, rerun `tests/demonstrations.smoke.spec.cjs`.
2. **Row editor** for the segment and interval rows of `PointSetControls` and the zero rows of `ZeroListEditor` (the last typed coordinate fields, and the source of the remaining ragged-buttons and point-as-fields hits).
3. **Fixture findings of step 4e:** `ValueListInput` and `PlaybackButtons` at 200 % text, a 32 px `ToolTippedButton`. The fixture's catalogue group renders only with `?catalogue=1` because of them.
4. **Phase portrait seed rows** are named "Začetna točka 1" and wrap; the lessons quote the name.
5. **M6:** stacked count setters in the counting tree.

## Working notes that still hold

- A label that a recipe (`scripts/demonstration-preview-recipes.cjs`) or clip row (`scripts/demonstration-clip-rows/`) addresses cannot be renamed without recapturing: the browser smoke compares the stored record with the row.
- The publish gate runs no browser smoke and CI runs all of it: run the full `just smoke` before a publish that changes a control.
- A change to a shared control's markup needs a repository-wide search of tests, not the slice's directories (step 4a broke two tests in `mechanics` and `curves/kinematics`).
- The machine is short on CPU and memory: one worker beside a publish gate, no dev server beside a full smoke run.
- Subagents cannot write report files; ask for the report as text.
- Tools: `node scripts/controls-sweep/sweep.cjs --port 4324 --workers 3` (about five minutes, needs a dev server), `node scripts/controls-sweep/shot.cjs`, `node scripts/controls-sweep/catalogue-shots.cjs` (regenerates `docs/controls/*.png`), `node scripts/controls-inventory.cjs --check`.

## Decisions

All recorded in the spec ("Decisions made during the work") and the findings. No open owner decision.
