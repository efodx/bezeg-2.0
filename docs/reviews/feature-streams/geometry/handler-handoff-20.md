# Geometry stream — handler handoff 20

Written 2026-11-01 by handler 20 (Opus 5.5, auto, effort medium), relaunched by the supervisor after handler 19 ended without a successor. Continues [handoff 19](handler-handoff-19.md). Claude Code stopped this session's context watcher and its test rerun because the machine was critically low on memory, and its rules forbid restarting them unasked, so the session ended without a successor.

## Where things are

- Branch `stream-geometry`, rebased onto `origin/master` `a8407d3b`. C1 WIP is `a7c5b7bc` (unverified, not on master), and this note is committed on top. The same commits are on `origin/geometry-handler-20-wip`.
- Rebase onto `9172bfa8` hit mechanical list conflicts with the Curves `curve-parametric`/`curve-curvature` lessons in six files: `guidedLessonOwnership.ts`, `guidedExamplePreviewCopy{,.test}.ts` (counts now 61 and 68), `lessonMathNotation.test.ts`, `lessonCatalog.test.ts` (dropped `interval-sweep` from the no-lesson list), and the smoke `LESSONS` row list. Each was resolved as a union. The second rebase onto `a8407d3b` was clean.

## Checks on C1 (at `d712d744`, before the second rebase)

- `just typecheck`: passed.
- Focused `just unit` (compgeo graphs, compgeo lessons, preview copy, notation, lesson catalog): 27 files and 326 tests passed.
- Full `just unit`: 4 failed, 7554 passed. All four were `GraphTransientState` rows for `triangle-centres`/`inscribed-angle`. Maps fixed them on master in `a8407d3b`. They do not come from C1.
- Handler review of the `set-points` mode gate in `PointSetGraph.applyPointSetAction` and of the `model.ts`/`lessonCatalog.ts` widening: no defects.

## Next, in order

1. On `a8407d3b`+: `just unit src/graphs/base/GraphTransientState src/learning` (killed for low memory this run), `just build`, `just smoke-lesson interval-sweep`, and both languages with a live switch. Then reword the WIP commit message into a proper commit (a new commit, no amend of pushed history needed: `git reset --soft` on the local unpushed-to-master commits is fine), rebase, push to master, and mark task 11 accepted in the sweep README and the stream line.
2. C2 (task 12) with one worker, sharing the trace-step code.
3. Posters, T1 chapter, F6: as in handoff 19.

## Settings to keep

Opus handler, auto, effort medium. Workers `bezeg-worker` Sonnet medium, one at a time. Run heavy commands one at a time, and only when another stream is not running its suite.

## Update: owner said "resume" (2026-11-01)

Rebased onto `4d1ef6cf`. One more mechanical list conflict in `lessonCatalog.test.ts` (Functions' projective ids), resolved as a union. At `69c5ccfb`: `just typecheck` passed; `just unit src/learning src/graphs/compgeo src/graphs/base/GraphTransientState` 99 files and 2105 tests passed; `just build` passed; `just smoke-lesson interval-sweep --port 4313` passed both rows (SL, EN); a temporary live-switch check (SL to EN to SL at trace step 7) passed: title, frame numbers, scene and every `data-interval-sweep` readout switched language with their numbers unchanged, no page errors. Pairs are reported one trace step after an insert, by design (trace length \(4n+p+1=26\)). C1 was committed as a feature commit and pushed to master; task 11 is accepted. Next is C2 (task 12).
