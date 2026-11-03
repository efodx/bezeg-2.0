# Geometry stream: handler handoff 47

Written 2026-11-03 by handler 47 (Opus 5.5, auto, effort medium). Continues [handoff 46](handler-handoff-46.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: the self-watch passed the 175k soft threshold during S3 F6.

## Done this run

1. **Sweep task 26 accepted and on master.** [Record](../../sweep-algorithms/26-acceptance.md).
   - The browser check passed at 1440×900 and 390×844, in SL and EN: the Voronoi in-text link reaches `#fortune`; math is typeset by MathJax; focus returns to the activity link; there were no errors. `just smoke-lesson fortune` passed.
   - Pushed `f395ecde..b070f202`. Hosted CI was green on `d963dd4c` (run 41660158085), which contains it; the run for `b070f202` itself was cancelled as superseded.
2. **S3 F6, partial.** [Record](f6-s3-acceptance.md).
   - **Matrix:** [f6-s3-evidence-matrix.md](f6-s3-evidence-matrix.md).
   - **Spec settled:** the C5 exception to C-1 (keep the step, as task 23 decided) and the cocircular cancel rule in acceptance 3.
   - **Docs gaps closed:** the capabilities row and two glossary entries.
   - **Gap tests:** G1 and G2.
   - **C-7 defect fixed:** the board and side-list current-event highlight.
   - **Checks:** `just check` at `b070f202`; bilingual smoke 10/11 (the partial check is explained in the record); perf median 16.7 ms with the highlight.
   - **Commits, rebased onto master `e0911cac` and pushed with this note:** docs `42e4dc4a`, tests `951c29c3`, C-7 `30e56244`, record `7023168f`. Before the rebase they were `7a6e650e`, `b4311e6e`, `1a16beb2` and `ab0b8391`; the F6 record cites these old hashes.

## Branch state

- `stream-geometry` = `origin/master` `e0911cac` + 4 F6 commits + this note, pushed to master.
- Post-rebase checks at `7023168f`: tsc clean, build passed, and unit `src/learning src/graphs/compgeo src/compgeo/sweep src/localization` (Vitest cache cleared) passed 170 files (2 skipped) and 2700 tests (3 skipped) ([log](f6-s3-rebase-unit.log)).

## Next steps, exactly

1. Confirm hosted CI for the push of this note (`gh run list --branch master`). If the F6 commits are somehow not on `origin/master`: fetch, rebase onto `origin/master` (standalone), recount only if a lesson, route or poster landed, then rerun tsc, the build and the focused unit run above (clear the Vitest cache first). Push with `git push origin HEAD:master` and confirm hosted CI.
2. **Recapture the `fortune` poster.** The C-7 ring now shows on D's site event, which is the recipe frame at `scripts/demonstration-preview-recipes.cjs:117`.
   - Do a selective capture as in handler 42 (stream notes): a production preview, with `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1` and `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`. Coordinate with Curves only if they are capturing at the same time.
   - View `src/images/demonstrations/catalog/fortune.png`: the ring is on D, the dashed false-alarm circle is crossed, and the circles are round.
3. Then mark S3 F6 accepted: in the record's State, in the sweep README `F6` row, and in the stream file row 3 (with **S3 F6 accepted**). Push and confirm CI.
4. Optional, not required for acceptance: show a short graph note for the collinear and cocircular examples. The lesson edge case already gives it.
5. **Worktree cleanup still needs the owner.** Ask before acting. The lists are in handoffs 40, 41, 43 and 44. `origin/geometry-fortune-lesson-wip` and `origin/geometry-fortune-chapter-wip` are now merged and are cleanup candidates.

## Risks and lessons

- The matrix worker hit 135k at 52 turns. Give future audit briefs fewer rows per slice.
- A focused unit run over `src/learning src/graphs/compgeo src/compgeo/sweep src/localization` takes more than 10 minutes. Run it in the background.
- Silent count collapse and the stale Vitest cache: as in handoff 46.

## Live processes

The 215k self-watcher, which ends with this session. The preview is stopped, and all workers have returned.

## Settings to keep

- **Handler:** Opus, auto, effort medium. Self-watch at 175k (owner override), then at 215k.
- **Workers:** `bezeg-worker` (Sonnet, effort high), at most two at once, each with a 135k watcher. Split slices near 135k from the start.
- **Smoke:** `bezeg-smoke` (Sonnet worked well for a full grid).
- **Successor launch,** from the stream worktree: `claude --bg -n "geometry handler 49" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. Each successor launches its own the same way and tells it to do the same.
