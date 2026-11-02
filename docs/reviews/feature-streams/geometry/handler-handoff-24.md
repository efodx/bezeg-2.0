# Geometry stream: handler handoff 24

Written 2026-11-02 by handler 24 (Opus 5.5, auto, effort medium) at the 150k soft threshold. Continues [handoff 23](handler-handoff-23.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md).

## Where things are

- Branch `stream-geometry` = `origin/master` `03dfe3b4` plus this note. Sources are clean. No worker, preview or watcher from this session is still running.
- **Accepted and pushed this run** (`0526e515..03dfe3b4`):
  - **F6 for triangulation T1 (B1) and sweep S1 (C1, C2):** record in [f6-t1-s1-acceptance.md](f6-t1-s1-acceptance.md).
    - The evidence matrix found one real gap: the family was not described in the capabilities doc or the glossary. Fixed in `267094df`.
    - `just check` at `790f8440`: 7844 tests passed.
    - Bilingual smoke: 28 passed, 0 failed.
    - Task READMEs and the stream line say "F6 accepted".
  - **Test-only slice** `29a41c23`: `stepWhile` in `src/graphs/compgeo/boundedSteps.testing.ts` now bounds every compgeo trace host loop that was unbounded. With Next mutated to a no-op, the tests fail in 12 s instead of hanging. After the rebase, tsc and the 7 affected files were rerun and pass.
  - **Evaluation records:** handler 23's poster worker and this run's two F6 workers, both in `docs/agent-workflow/evaluation-log.md`.
- **Hosted CI:** on `fb1d09e1`, master is red only in `GraphTransientState.part2` (`inscribed-angle`, Maps) and `part3` (`patch-coons`, Curves). Neither involves Geometry. Curves has since pushed `f66e274b`, which fixes the Coons lesson camera. The run for `03dfe3b4` had not been checked when this note was written.

## Remaining, in order

1. **Check hosted CI on `03dfe3b4`** (`gh run list --branch master`). Only the Maps/Curves rows above should be red, or none. Fix anything Geometry caused before other work.
2. **Convexity Batch 1 F6** (A1, A2, A4 and chapter `convexity-hulls`) has no acceptance record. Do it the same way as [f6-t1-s1-acceptance.md](f6-t1-s1-acceptance.md):
   - a reviewer evidence matrix against the convexity spec's acceptance lists and batch gate;
   - `just check`, if `src` has changed since `03dfe3b4` in a way that affects it;
   - a bilingual smoke of `orientation`, `polygon-area` and `convex-hull` plus the chapter.
   - Add to the smoke brief: record the exact input of every refusal check.
3. **Next batches:** triangulation T2 (B2, B3) and sweep S2 (C3, C4), per their READMEs. Write the task files first; their kernels (Delaunay/Lawson, triangulation structure) are accepted. S2 needs T1 released, which it now is.

## Risks

- Memory: 3.4 GB was free at the start. `just check` waited on other sessions and took 19 min. Run heavy checks one at a time.
- After a lesson exit, the URL keeps `learnChapter`/`learnSection`. This is shared Learn-runtime behaviour, noted in the F6 record, and not Geometry's.
- `src/demonstrationMotionAssets.ts` can show a CRLF-only change after captures. Check it with `git diff --ignore-cr-at-eol` and never stage it.
- The F6 smoke screenshots (`f6-smoke/*.png`, 6.6 MB) are untracked on purpose.

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers: `bezeg-worker` Sonnet medium, one at a time. Reviews: `bezeg-reviewer` Sonnet. Smoke: `bezeg-smoke` Sonnet.
