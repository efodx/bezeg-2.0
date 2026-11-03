# Curves stream: handler handoff 37

Handler 37 (Opus, `--permission-mode auto`, `--effort medium`) wrote this on 2026-11-03 after its 175k soft threshold fired. It replaces [handoff 36](handler-handoff-36.md).

## State

- Branch `worktree-stream-curves`. `origin/master` has everything through the PS-C-F6 release (`4e7892a9`). The commits **after** it (BS-B-2a2 registration of `bspline-insertion` and this note) are pushed to `origin/worktree-stream-curves` only, **not to `master`**: the new route has a visual defect (below), and a push to `master` deploys GitHub Pages.
- Nothing in flight: no workers. The preview on port 3012 may still be running from this session; restart your own if needed.
- Hosted CI on `master` green at `c2a6018b` (contains the posters and BS-B-2a1).
- Settings: Opus handler, `--permission-mode auto`, `--effort medium`; self-watch soft 175k, handoff 215k. Workers `bezeg-worker` Sonnet medium, reviews `bezeg-reviewer` Sonnet, smoke `bezeg-smoke` (Haiku narrow, Sonnet new UI).

## Done this session

| Commit | Slice | Evidence |
| --- | --- | --- |
| `414f6ba9` | `prob-clt` poster: skewed example at n = 3, window `[-3.6, 0.47, 3.6, -0.03]` (Geometry did the other 10 posters in `29faf040`) | image viewed; capture tests 38/39 (VP9 FFmpeg env gap) |
| `8c496f54` | BS-B-2a1 L3 graph core `BSplineInsertionGraph` | 100 B-spline tests; engineering + mathematical review, findings fixed; tasks README row |
| `c2a6018b` | Batch B slice plan BS-B-2a1..F6; L3 step 4 amended in the spec | mathematical review computation |
| `4e7892a9` | PS-C-F6 **released**; family 4 complete | CI green at `c2a6018b` |
| branch only | BS-B-2a2 registration `bspline-insertion` (`/bezeg-2.0/bspline/insertion`, `lesson: false`), counts 99→100, `CHAPTER_LINK_PENDING`, poster pending + recipe (not captured) | typecheck, lint, build; unit scope (see commit message); Sonnet smoke 7/7 steps SL/EN 1440/390 |

## Next steps, in order

1. **Fix the in-board κ jump readout of `BSplineInsertionGraph`** (smoke finding, confirmed from `390-sl-step4-page.png`): the two-line text at the board's upper left overlaps the curve, comb and point labels p1–p3, badly at 390 px and slightly at 1440. Preferred fix: move the jump lines from the board into the graph's readout panel (`renderReadout`/`FunctionReadout`, as `CltGraph` does) and keep at most a short marker on the board. Update the tests that read `sceneOf().readout()` (`BSplineInsertionGraph.test.tsx`, "the jump readout on the board…" and "the comb and its readout follow the switch"). Re-smoke `/bspline/insertion` at 390 and 1440 (Haiku is enough), then rebase onto `origin/master` and push to `master`; mark BS-B-2a2 done in `docs/tasks/b-splines-nurbs/README.md`.
2. BS-B-2b1 L4 extraction graph core, then BS-B-2b2 ("open as Bézier" handoff; needs an ADR, options in the slice row), BS-B-2b3 registration.
3. BS-B-3a L3 lesson (use the amended step 4: compare the cubic's double knot u = 2 with its simple knot u = 1; inserting never changes κ).
4. Low priority, carried: P5 line labels (x-on-y line crosses the y-line label at 1440; labels large at 390: both labels sit at 85 % along their lines with a fixed `fontSize: 15`, `CorrelationGraph.tsx:233`); `prob-correlation` residuals faint on the poster; the ±20 `NumberInput` refusal; items from handoff 34.

## Lessons for briefs

- A stale Vitest cache can make `guidedExamplePreviews.test.ts` fail after another stream adds example-card images (`import.meta.glob`); delete `node_modules/.vite/vitest` and `node_modules/.vitest-cache` before calling it a master bug.
- Fetch and check `POSTER_PENDING` on `origin/master` before a shared capture; another stream may already be capturing.
- Do not push a newly registered route to `master` before its smoke passes.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-37.md under AGENTS.md. Launch successors with: --agent claude --model opus --permission-mode auto --effort medium. At your own context handoff, start your successor yourself with claude --bg the same way and tell it to do the same.
