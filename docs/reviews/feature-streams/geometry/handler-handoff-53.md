# Geometry stream: handler handoff 53

Written 2026-11-05 by handler 53 (Opus 5.5, auto, effort medium). Continues [handoff 52](handler-handoff-52.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md). Reason: the self-watcher reached 175k with tasks 24–27 on `master`.

## Done this run

1. **Hosted CI for the handoff 52 push:** run 41962613766 succeeded on `e0aed85f`.
2. **Task 24 accepted** after mathematical review (no defect; crossing, near-miss and cubic rows recomputed exactly to depth 5). On `master` at `20cc2aef`.
3. **Task 25 accepted.** `CurvePairGraph` (slice 25a) and `BezierHullsGraph` (25b). Engineering and UI review: no blocker, three low findings repaired.
4. **Task 26 accepted.** Readout, controls, Presets (own key `compgeo-bezier-hulls`). The measurement exceeded a frame, so the task's fallback was applied: pieces are a fixed set of `NaN`-break curves, and the last step fell from 114 ms and 382 objects to 9.3 ms and 66 ([measurement](../../convexity-hulls/26-measure.md)). Review: no blocker. Its five minor findings are repaired, including a hidden live paragraph in place of an `aria-live` flip.
5. **Task 27 accepted.** Route `/bezeg-2.0/compgeo/bezier-hulls`, title "Ovojnice Bézierovih krivulj", 110 Demonstrations, `bezier-hulls` in `POSTER_PENDING`, poster recipe at the depth 3 verdict.
6. **Curves told** that the D2 graph may start (note at the top of the stream file's notes).

## Decisions made

- The route smoke's depth 4 picture did not show the answer: the whole-curve hull fill hid the pieces. Past step 0, with `pieces` on, the whole-curve hull is an unfilled faint outline, and kept pieces sit above the curve at width 6. See `27-smoke/repair9.png`. Task 25's text records this.
- The Preset collections live in `compgeoPresetCollections.ts`, and the curve-pair keys in `curvePairPresetCollection.ts`, because importing `CurvePairGraph` there made an import cycle.
- Kept pieces of curve B stay dashed, so the two curves differ by more than colour.
- Left as is: arrow keys need the board focused, so selecting a point in the inspector does not route them. That is the base graph's behaviour.

## Branch state

`origin/master` holds everything, including this note. Local `stream-geometry` matches it. `origin/geometry-batch3-wip` keeps pre-rebase copies and is superseded: its content is on `master`. Evidence logs are untracked at `docs/reviews/convexity-hulls/2[4-7]*`.

Gate: full focused units passed at `ced32616` (1016.6 s). After it, only `BezierHullsGraph.tsx`, its host test and one locale string in each language changed, covered by BezierHulls and localization units, tsc, lint and build at the commit before this note.

## Next steps, exactly

1. Confirm hosted CI for this push (`gh run list --branch master`).
2. Task 28, one worker slice: scene and wiring only, with `set-trace-step`, the lesson, and the chapter section. Keep the tests for 29. `lesson: false`, the opt-out list in `lessonCatalog.test.ts` and `CHAPTER_LINK_PENDING` in `familyChapters.test.ts` must all lose `bezier-hulls`. The lesson's last steps should rely on the new look; at step 1 use `set-overlay hull`. Run `just smoke-lesson bezier-hulls` before accepting.
3. Task 29, then the F5 poster (empty `POSTER_PENDING` first; a selective capture) and F6 acceptance, as the end of [task 29](../../../tasks/convexity-hulls/29-lesson-bezier-hulls-tests.md) says. Include a browser Preset save and reload: the route smoke could not confirm one, though host tests cover the round trip. Add a grab of a point inside a filled kept piece.
4. Convexity is then complete. Record the evaluation entries for this batch.
5. **Cleanup needs the owner.** `origin/geometry-batch2-wip` and `origin/geometry-batch3-wip` can be deleted with permission. The other lists are in handoffs 40, 41, 43 and 44, plus `origin/geometry-fortune-lesson-wip` and `origin/geometry-fortune-chapter-wip`. Ask before acting.

## Risks and lessons

- **Look at the picture yourself.** Unit tests and the smoke passed on a last step that showed nothing useful; only reading the screenshot found it. Do the same for the lesson's steps and the poster.
- `docs/current-architecture.md` still says `hull-robustness` has no poster and no lesson. Correct it at F6.
- Two writers in `BezierHulls*` collided briefly: the registration worker moved the collection while the handler repaired review findings, which gave false tsc and load failures. Do not repair in a file a running worker may reach.
- The self-watcher reached 175k quickly again: many short notifications each re-read the context. Keep turns few, and wait for all workers before acting.
- `python` scripts for multi-file edits should apply every assertion before writing, or be safe to rerun: one stopped halfway here.

## Live processes

The 215k self-watcher, stopped at this handoff. No worker or preview is running.

## Settings to keep

- **Handler:** Opus, auto, effort medium. Self-watch at 175k (owner override), then at 215k.
- **Workers:** `bezeg-worker` (Sonnet, high), reviews `bezeg-reviewer` (Sonnet; Haiku for a routine visual check), smoke `bezeg-smoke` (Sonnet). At most two at once, each with the watcher the launch hook prints.
- **Successor launch,** from the stream worktree: `claude --bg -n "geometry handler 55" --agent claude --model opus --permission-mode auto --effort medium "<prompt>"`. Each successor launches its own the same way and tells it to do the same.
