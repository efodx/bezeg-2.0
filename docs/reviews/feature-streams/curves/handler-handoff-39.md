# Curves stream: handler handoff 39

Handler 39 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-03 after its 175k soft threshold fired. It replaces [handoff 38](handler-handoff-38.md).

## State

- Branch `worktree-stream-curves`, rebased on `origin/master`. BS-B-3a is on `master` (`55ced5ec`, hosted CI green). BS-B-3b (`96c2b11b`) was rebased onto `cfb55afd` (numerical N5 lesson), rechecked (tsc; `just unit src/learning src/demonstrations src/graphs/curves/bspline` 1918 passed plus `guidedExamplePreviews.test.ts`, which failed only from the stale Vitest module cache for the new Euler card image, passed with `--no-fsModuleCache`; cache cleared) and pushed to `master` with this note. Hosted CI not yet seen.
- No preview server or worker is running.
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Haiku for narrow checks, Sonnet for new UI).

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `b64473a3` (wip), `6b1ab2f6`, `55ced5ec` | BS-B-3a L3 lesson on `bspline-insertion`. Handler repair: `BSplineInsertionGraph` lacked `lessonDefaultState`, so lesson-fixture scenes (the cubic) were overwritten by the default quadratic. The test checked u=1 instead of u=0.5. | [evidence](../../b-splines-nurbs/bs-b-3a-l3-lesson.md): full suite 10551; mutations; engineering and mathematical reviews; Haiku browser sl/en |
| BS-B-3b commit `96c2b11b` | BS-B-3b L4 lesson on `bspline-extraction` plus the L4 chapter section. BS-B-4 is absorbed, since each lesson needs an owning section. Same `lessonDefaultState` fix on `BSplineExtractionGraph`. | [evidence](../../b-splines-nurbs/bs-b-3b-l4-lesson.md): full suite 10583 before the rebase; mutations; review with Slovenian wording fixes; Haiku browser sl/en incl. open as Bézier and Back |

Rebase onto N5: chapter coverage is 116 and preview copy is 102/109 (L3, N5, L4). `CHAPTER_LINK_PENDING` is `patch-coons`, `fortune`; lesson opt-outs `fortune`.

## Next steps, in order

1. Check hosted CI on the pushed head.
2. BS-B-5 posters: `POSTER_PENDING` on master was `['bspline-extraction', 'fortune']`. A selective capture cannot leave another Demonstration pending, so capture both jointly, as another stream did for `bspline-insertion` in `fd5d206e` (recipes exist in `scripts/demonstration-preview-recipes.cjs`). First check that the geometry stream has not already captured `fortune`. See `docs/commands.md` (`PREVIEW_RECAPTURE_IDS`, `node scripts/capture-demonstration-previews.cjs`). Inspect both posters by eye.
3. Family page cards: the handoff 38 note said the family page had no cards for the two routes. Check whether removing them from `CHAPTER_LINK_PENDING` sufficed, or whether a card registry needs entries (smoke reports flagged a missing card).
4. BS-B-6 Batch B gate, modelled on BS-A-6 in the [task plan](../../../tasks/b-splines-nurbs/README.md): criterion-to-test audit, `just check`, hosted CI, `smoke-lesson bspline-insertion bspline-extraction`, browser smoke of both routes and `/learn/b-splines`.
5. Low priority, carried over: P5 line labels (`CorrelationGraph.tsx:233`), faint `prob-correlation` residuals on its poster, the ±20 `NumberInput` refusal, items from handoff 34.

## Risks and notes

- At 390×844 the lesson card covers most of the board in observation frames (shared lesson runtime). Observed for L3 and L4; not a slice defect, but worth an owner look.
- Back from "open as Bézier" returns to a plain extraction page without the lesson (ADR 0038); the L4 prose says so.
- Any other B-spline-family graph with `lessonFixtureData` needs a `lessonDefaultState` override that keeps the imported curve (see `DeBoorGraph`).

## Lessons for briefs

- The `just unit` console output has no totals; read them from the `.command-logs/...` path it prints.
- Parallel streams bump the same counters (chapter coverage, preview copy, pending lists). On rebase, recompute them rather than taking either side.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-39.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
