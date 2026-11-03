# Curves stream: handler handoff 38

Handler 38 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-03 after its 175k soft threshold fired. It replaces [handoff 37](handler-handoff-37.md).

## State

- Branch `worktree-stream-curves`, rebased on `origin/master`. Everything listed under "Done" through `feee74c2` is on `master`; hosted CI green at `81fc810c` (the run for `feee74c2` was not checked by this handler).
- BS-B-3a: wip commit on the branch only, see "In flight".
- The preview on port 3012 may still be running from this session (build of the tree before BS-B-3a); restart your own if needed.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium, reviews `bezeg-reviewer` Sonnet, smoke `bezeg-smoke` (Haiku narrow, Sonnet new UI).

## Done this session

| Commit (master) | Slice | Evidence |
| --- | --- | --- |
| `79718dc5` | κ jump readout of `BSplineInsertionGraph` moved from the board into the inspector (`[data-insertion-readout="jumps"]`, shown with the comb) | 100 B-spline tests; Haiku re-smoke 1440/390 SL/EN passed; 390 screenshot viewed |
| `8146299a`, `5b7c6290` | BS-B-2a2 `bspline-insertion` registration, marked done | CI green at `81fc810c` |
| `81fc810c` | BS-B-2b1 L4 graph core `BSplineExtractionGraph` | 23 tests, mutations; engineering + mathematical review (independent Boehm, brute-force supports) |
| `e2452e0e` | BS-B-2b2 open as Bézier, [ADR 0038](../../../adr/0038-open-as-bezier-router-state-handoff.md) (one-shot `location.state` handoff; `GraphRoute` consumes, workspace never forwards) | 11 host + 1 workspace test, mutations; engineering review finding (workspace forwarding race) fixed failing-first |
| `d255e87c`, `feee74c2` | BS-B-2b3 `bspline-extraction` registration (`/bezeg-2.0/bspline/extraction`, counts 100→101, poster pending + recipe, not captured); accessible-name fix | full suite 538 files / 10526 tests, build; Sonnet smoke 1440/390 SL/EN incl. handoff, reload, Back, keyboard |

## In flight

BS-B-3a (L3 lesson on `bspline-insertion`): commit `f08ecc53` (**wip, unverified**) on the branch, pushed to `origin/curves-handler-38` only. The Sonnet worker hit its budget and handed off: [worker note](bs-b-3a-worker-handoff.md), draft evidence [bs-b-3a-l3-lesson.md](../../b-splines-nurbs/bs-b-3a-l3-lesson.md) (Checks section is a placeholder). Contents: lesson action `knot-insertion` (`insert`, `set-example`, `set-comb`, `reset`) in `src/learning/model.ts`, registered by `BSplineInsertionGraph`; six-step lesson `src/learning/content/bsplineInsertionGuidedLessons.ts` with the amended step 4; 8 tests in `bsplineInsertionGuidedLessons.test.tsx`; `b-splines` chapter gains a third section (owner of L3); `lesson: false` removed; `bspline-insertion` removed from `CHAPTER_LINK_PENDING` and the lesson opt-out list; preview copy, notation lists and smoke row added. The worker's last unit run had fixed a parse error (apostrophe in `bsplineChapter.ts`) and its rerun result is unknown. **Not run:** tsc, eslint, the new tests, mutations (disable each action handler once), `just build`, `just smoke-lesson bspline-insertion`. Worker cautions: `bsplineChapter.ts` section text was written by a script (check doubled backslashes with `lessonMathNotation.test.ts`); the `BSplineInsertionGraph` class doc still says "Not registered as a route yet". A worker scratch test was moved out to the job tmp dir.

## Next steps, in order

1. Verify and complete BS-B-3a: run the checks above, fix failures (repair worker or handler), recompute the step numbers against the spec (L3 defaults), fix the class doc, complete the evidence note, Haiku browser check of `?learn=1` (SL/EN), mark the README row, then push to `master` with the rest of the branch (the wip commit stays in history, followed by the fix commits).
2. BS-B-3b L4 lesson on `bspline-extraction` (step 3 uses the open-as-Bézier button; the handoff is router state, so a lesson can only point at the button, not navigate on its own).
3. Batch B release: posters for `bspline-insertion` and `bspline-extraction` (fetch and check `POSTER_PENDING` on `origin/master` first), chapter links (`CHAPTER_LINK_PENDING`; the family page has no cards for the two routes yet), then the release slice as in the plan.
4. Low priority, carried from handoff 37: P5 line labels (`CorrelationGraph.tsx:233`), `prob-correlation` residuals faint on the poster, the ±20 `NumberInput` refusal, items from handoff 34.

## Lessons for briefs

- Push with a dirty worker tree: cherry-pick the accepted commits onto `origin/master` in a temporary `git worktree add --detach` under the job tmp dir, link `node_modules` with `mklink /J`, check there, push from there. Remove the junction with `cmd /c rmdir` **before** `git worktree remove --force`.
- The full unit suite takes over 10 minutes here; run it in the background.
- Smoke reports can mark a family-page card missing: expected while a route is in `CHAPTER_LINK_PENDING`.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-38.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
