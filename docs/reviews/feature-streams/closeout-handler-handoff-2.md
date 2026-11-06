# Stream closeout: handler handoff 2

Written 2026-11-06 by the closeout handler (Opus 5.5, auto) at the soft context threshold. Spec: [stream closeout](../../specs/stream-closeout.md). Earlier note: [handoff 1](closeout-handler-handoff-1.md). Worktree `.claude/worktrees/stream-closeout`, branch `worktree-stream-closeout`. Its `node_modules` is a junction: delete it before removing the worktree.

## State of Git

`master` is at `0bf7348e`. The branch is three commits ahead, pushed to `origin/worktree-stream-closeout` and **not on `master`**, because they have had no engineering or mathematics review:

- `554a670f` `convexity-hulls`, 6 cards
- `67d84752` `triangulations-voronoi`, 5 cards
- `acbc1498` `sweep-algorithms`, 5 cards

Plus the commit of this note and the running note [closeout-card-images.md](closeout-card-images.md).

## Accepted

- Hosted CI for `d6269a71`: Developer tools and Browser smoke passed.
- Disclosure browser check passed in sl and en, by keyboard, with typeset math ([evidence](closeout-disclosure-smoke/), `0bf7348e`). Covers `rational-decasteljau` at 1440x900 only: no touch, screen reader or console warnings.
- All seven chapters have guided example cards, through `chapterOwnedLessons`, so the spec's condition for capture holds for all of them.

## Done, awaiting review

16 cards in three chapters. The handler viewed every image against its copy.

Decisions made here, for the reviewer to test:

- `captureRecipeForEntry`: `voronoi-degenerate` fits its own scene, because the poster frames the Trapez example and cropped site \((1,-5)\).
- `assertPresentationGeometryStable`: the card `sweep-algorithms.fortune.fortune` alone may move its sweep line, only while the line stays above every site (`isOpeningSweepLine`). Reason: `lineY: level ?? maxY` in `fortuneGeometry.ts:292`, so before the first event the height follows the view. Points stay strictly compared. A wider first rule was removed.
- The `delaunay` caption was rewritten: the image labels the diagonal illegal, which is correct (\((0,2)\) lies inside the circumcircle of \((0,0),(4,0),(5,3)\)).
- Manifests of these chapters record `sourceStateDirty: true`, as three released chapters do.

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| `node --test` of both script test files | `acbc1498` tree | 42 passed |
| `just unit --no-fsModuleCache` previews and `lessonMathNotation` | `acbc1498` tree | Passed |
| `just typecheck` | `acbc1498` tree | Passed |
| `just check`, smoke | | Not run on these commits |

Observed failures: the voronoi framing test and the Fortune capture rejection were each seen failing before the fix.

## Remaining, in order

1. Chapters 4 to 7: `triangle-geometry` (5), `interpolation` (5), `probability` (5), `b-splines` (6). One worker per chapter, one at a time. Registry facts are in the running note.
2. Review all seven chapters' diff under [review routing](../../agent-workflow.md#review-routing): engineering, and mathematics for the authored expectations. Repair, then rebase and push to `master`.
3. After the last capture: `npx vitest --clearCache` once (documented, `docs/commands.md` line 18; the cache is shared with the main checkout and now hides the new PNGs from plain `just unit`). Then `just check`, and a smoke of chapter cards on the affected Learn pages.
4. Mark the spec row "Example card images" done. Add the [evaluation entry](../../../.agents/skills/subagent-flow-evaluation/SKILL.md#do-log) for this run: not yet recorded.
5. Optional cleanups: handoff 1, item 4, unchanged.

## Brief inputs for a chapter worker

Goal: card images for one chapter. Acceptance: captured, full manifest, every image viewed, the checks below. Spec row "Example card images". Owned paths: generator and capture scripts and their tests, `src/learning/content/<x>PreviewCopy.ts`, `guidedExamplePreviews.ts` and its test (`functionsCards` row), `docs/commands.md` line 54, `docs/reviews/<id>/guided-example-inventory.json`, `src/images/learning/examples/<id>/`. Template: `git show acbc1498`.

What three workers taught:

- A worker fits one chapter: two runs spent about 145k on one. Say so, and tell it to read narrowly and capture as soon as the code typechecks.
- Capture needs `PREVIEW_BASE_URL=http://127.0.0.1:3012/bezeg-2.0` with `just preview 3012`; the default port is 4387.
- `just tooling-test` does not run the two script test files: use `node --test scripts/generate-guided-example-inventory.test.cjs scripts/capture-guided-example-previews.test.cjs`.
- Use `just unit --no-fsModuleCache`, or new PNGs report a missing `src`.
- Tests cannot see a crop or a false caption. Both happened. View each image yourself after the worker does, and read on-board labels against the caption.
- Workers may add an id to `captureRecipeForEntry` for a crop, with a test. Other capture rules are the handler's decision.
- Check a validator failure's real `boundingBox` before writing a rule: the handler's first rule was built on the poster window and was wrong.
- `scripts/*.cjs` can be CRLF. Heredocs mangle doubled backslashes: edit copy with the Edit tool.
- Likely trouble: `probability` and `interpolation` may hold bars, histograms or sampled data, and `b-splines` has knot-dependent scenes; a poster may frame another scene.

## For the owner

- The two script test files run in no recipe, package script or workflow. Adding them to `tooling-test` is a small follow-up; not done.
- Board label layout, left as is: `s1` and `s2` overlap on `segment-intersections`, lines cross labels on `monotone-triangulation`, and the `delaunay` label touches its diagonal.
- Seven `chrome-headless-shell` processes, roots PIDs 25940 and 29124, date from 3 November: not from this run, and not touched.
- From handoff 1, still open: remote branch deletion ([candidates](closeout-branch-candidates.md)). `origin/worktree-stream-closeout` is a new remote branch to delete once its commits reach `master`.

## Settings

Handler Opus, `--permission-mode auto`; workers `bezeg-worker` Sonnet `medium`, review `bezeg-reviewer` Sonnet `medium`, narrow smoke `bezeg-smoke` Haiku `medium`. `gh` is not installed: read CI from `https://api.github.com/repos/efodx/bezeg-2.0/actions/runs?head_sha=<sha>` and parse the JSON, as a text match on it fails silently. Each handler starts its successor with `claude --bg` and passes that rule on.
