# Geometry stream: handler handoff 51

Written 2026-11-05 by handler 51 (Opus 5.5, auto, effort medium). Continues [handoff 50](handler-handoff-50.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: the self-watcher passed the 175k soft threshold just after Batch 2 was accepted.

## Done this run

1. **Hosted CI for 832d95b5:** run 41948930536 succeeded.
2. **Task 22 accepted:** lesson A5 `hull-robustness` with its chapter section. Brief 22b stopped at 135k with nothing run, so brief 22c finished the tests. Both mutations were caught. `just smoke-lesson hull-robustness point-in-polygon` passes.
3. **New lesson action `set-panel`** (`inexact`, `exact`): the graph had `setKettnerPanel` but no action, so step 6 told the learner to pick Exact. Steps 5 and 6 now scene their panel.
4. **Task 23 accepted:** chapter smoke at 1440×900 and 390×844 in SL and EN, with focus return from both lessons.
5. **F5:** `hull-robustness` passed. On `point-in-polygon` the crossing number sat on the vertical edge. The cause was in the graph, so it was fixed there (`36e48360`, the number now sits beside the crossing) and the poster recaptured (`a523c029`).
6. **Batch 2 F6 accepted:** [record](f6-convexity-batch2-acceptance.md), [matrix](f6-convexity-batch2-matrix.md). `just check` passed at `a523c029`. `GLOSSARY.md`, `docs/capabilities.md` and `docs/current-architecture.md` were updated.
7. **Rebase union:** `authoredChapterCoverage.test.ts` conflicted at 124 and 123; the union is 125, and master had added two. `guidedExamplePreviewCopy.test.ts` is 109 and 116.

## Branch state

Local `stream-geometry` = origin/master + this note. **If this note is on origin/master, the push gate passed.** Gate: `just check` at `a523c029`; only docs came after it.

## Next steps, exactly

1. Confirm hosted CI for this push (`gh run list --branch master`). A cancelled run is normal when a newer push follows; check that a descendant run succeeded. CI for `16ea3805` had not finished when this note was written.
2. **Batch 3 (A6) planning.** Read spec [A6](../../../specs/convexity-hulls-lessons.md#a6-back-to-bézier-hulls-of-control-polygons) and the "Later batches" entry in the [convexity tasks](../../../tasks/convexity-hulls/README.md). The kernel (task 11, ADR 0036) is accepted. Write the task files for the pair-of-curves view (measure at depth 4), then F2b, F3, F4, F5 and F6. Check the Curves stream's D2 first: its graph waits on this test and may share the view.
3. **Worktree and branch cleanup needs the owner.** `origin/geometry-batch2-wip` can be deleted with permission. The other lists are in handoffs 40, 41, 43 and 44, plus `origin/geometry-fortune-lesson-wip` and `origin/geometry-fortune-chapter-wip`. Ask before acting.

## Risks and lessons

- **Smoke scripts:** a check that clicks Exit must also click "Exit and restore graph". Exit only opens a dialog; the smoke read the state with it open and reported a false restore failure. Reproduce a surprising failure before repairing it.
- **`just lint` scans `docs/reviews`.** Untracked `.cjs` scripts from a smoke worker there can fail `just check`. Tell smoke workers to keep them lint-clean or outside the repo.
- **Lesson briefs with a section are two slices.** 22b reached 135k at 50 turns with no check run. Split the scene and wiring from the test and gates from the start.
- A reviewer's negative claim about a doc can be wrong: one said Batch 1 was absent from `capabilities.md`, and it was not. Check before writing.
- Half-open rule wording: a vertex the ray only touches counts zero or two times, not once.
- The full focused gate takes about 1040 s and master moves faster than that. After a late rebase, rerun tsc, the overlapping tests, build and lesson smoke rather than the whole gate.
- `bash` heredocs and inline Python can lose backslashes in lesson prose. Use the Edit or Write tool, or `chr(92)`.

## Live processes

The 215k self-watcher, which ends with this session. No preview is running.

## Settings to keep

- **Handler:** Opus, auto, effort medium. Self-watch at 175k (owner override), then at 215k.
- **Workers:** `bezeg-worker` (Sonnet, high), reviews `bezeg-reviewer` (Sonnet; Haiku for a routine visual check), smoke `bezeg-smoke` (Sonnet). At most two at once, each with the watcher the launch hook prints.
- **Successor launch,** from the stream worktree: `claude --bg -n "geometry handler 53" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. Each successor launches its own the same way and tells it to do the same.
