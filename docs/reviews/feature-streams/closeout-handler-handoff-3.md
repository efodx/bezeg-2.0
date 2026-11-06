# Stream closeout: handler handoff 3

Written 2026-11-06 by the closeout handler (Opus 5.5, auto) at the soft context threshold. Spec: [stream closeout](../../specs/stream-closeout.md). Earlier note: [handoff 2](closeout-handler-handoff-2.md). Running note: [closeout-card-images.md](closeout-card-images.md). Worktree `.claude/worktrees/stream-closeout`, branch `worktree-stream-closeout`. Its `node_modules` is a junction: delete it before removing the worktree.

## State of Git

`master` is at `0bf7348e`, and `origin/master` had not moved at the last fetch. The branch is pushed to `origin/worktree-stream-closeout` and is **not on `master`**: repairs below come first. Tree clean at the commit of this note. Ahead of `master`: `554a670f` convexity-hulls, `67d84752` triangulations-voronoi, `acbc1498` sweep-algorithms, `9a739b2b` handoff 2, `9734df07` triangle-geometry, `f90ebe8a` interpolation, `64ced70f` probability, `f96a4d92` b-splines, `158e9700` docs.

## Accepted

All seven chapters are captured: 37 cards. The handler viewed the 21 images of `triangle-geometry` (5), `interpolation` (5), `probability` (5) and `b-splines` (6) in this run; handoff 2's handler viewed the other 16, and four of those again here.

Review of `0bf7348e..158e9700` is complete: engineering (static, nothing run) and mathematics in two halves, 37 cards. **No blocker and no mathematical error.** Confirmed: the `delaunay` diagonal, `voronoi-degenerate` framing, `fortune` line above every site, all `counts` rows, `captureRecipeForEntry` scope, generator rejection of other scenes, lazy registries, and every value in the `interpolation`, `probability` and `b-splines` copy.

Decided here: `text` stays unasserted for basis, de Boor, clt, runge and least-squares (`guided-example-preview-api.cjs:225` checks only present keys; the capture hides board text over 65 characters).

## Checks

| Check | Revision | Result |
| --- | --- | --- |
| `node --test` of both script files | `f96a4d92` tree | 47 passed |
| `just unit --no-fsModuleCache` previews and `lessonMathNotation` | `f96a4d92` tree | Passed |
| `just typecheck` | `f96a4d92` tree | Passed |
| `just check`, smoke | | Not run on these commits |

## Remaining, in order

1. Repairs: small, keep them with the handler.

   Engineering, should-fix: add `isOpeningSweepLine` and `isViewportGeneratedInWindow` to `presentationHelpers()` (`capture-guided-example-previews.cjs:42`), so that editing them changes the fingerprint. Add a test on the model of "presentation fingerprint includes resize behavior" (`.test.cjs:232`) and see it fail first. Earlier helper edits already changed this fingerprint with no test failing, so released manifests are not checked against it. Confirm that by running the tests.

   Copy, all reviewed as notes; the handler judged each worth fixing. Use the Edit tool, or Python raw strings: heredocs damaged backslashes twice in this run.

   - `interpolationPreviewCopy.ts` runge alt: each side has a small bump beside the peak, a dip, then a large bump near the end (p-f is +0.18, -0.23, +0.61). The alt names one bump.
   - `probabilityPreviewCopy.ts` summary caption: "Sredina (povprečje) je". clt caption, last sentence: "Z večanjem \(n\) se ji standardizirana vsota približuje." / "As \(n\) grows, the standardized sum approaches it."
   - `trianglePreviewCopy.ts`: notable-points "da je trikotnik ostrokoten"; simson-line alt: drop the names \(D\), \(E\), \(F\), which the board does not attach to points.
   - `triangulationPreviewCopy.ts:29,35`: "kvadratna točka poizvedbe" reads as quadratic: "točka poizvedbe v obliki kvadrata".
   - `sweepPreviewCopy.ts` interval-sweep alt: add the labels a to e and the dashed blue line along \(a\). Image viewed.
   - `sweepPreviewCopy.ts` segment-intersections alt: add the labels \(s_1\) to \(s_4\), with \(s_1\) and \(s_2\) overlapping at the middle. Image viewed.
   - `sweepPreviewCopy.ts` monotone-triangulation alt: add the thick blue piece, dashed diagonal, green remaining edges, orange sweep line at the top, ring on \((4,8)\) and the labels "1 spodnje oglišče", "2 desna veriga", "5 desna veriga", "6 zgornje oglišče". Image viewed. **Unverified:** the caption's empty stack and "first piece". Check `triangulationView(15)` in `MonotoneTriangulationGraph.tsx`, lines 63-160, against the generator comment at line 1253.
   - `convexityPreviewCopy.ts` hull-robustness: the image is one dark stroke through three dots, no text. Say the chains and the hull coincide on one segment, in the alt and the caption.

   Optional, cheap: generator comment at about line 389 ("the caption texts do not count") names another mechanism; the usage comment at capture line 3 omits the new families.

2. Commit the repairs, then **recapture all seven chapters from that clean commit** and commit only the new manifests, expecting identical PNGs (compare hashes first). Why: the fingerprint change makes these manifests stale, and five of seven record `sourceStateDirty: true` with a parent revision. Copy is not in the image, so PNGs should not change: treat any change as a finding. This supersedes handoff 2's acceptance of dirty manifests. Run `just build` first: `just preview` refuses a stale build. `PREVIEW_BASE_URL=http://127.0.0.1:3012/bezeg-2.0 node scripts/capture-guided-example-previews.cjs docs/reviews/<id>/guided-example-inventory.json --family <id>`, `--family` after the path. Stop the preview by PID.

   `triangle-geometry` and `interpolation` record `false` although work was uncommitted: the flag covers only `src/learning`, `src/graphs`, `src/demonstrations.ts` and `src/Routes.tsx` (capture line 585), so `scripts/` edits do not count. Likely the copy was written after capture; not confirmed. Worth an owner note, not a change.

3. Rebase if `master` moved, recheck, `git push origin HEAD:master`.
4. `npx vitest --clearCache` once (`docs/commands.md` line 18; the cache is shared with the main checkout and hides the new PNGs from plain `just unit`). Then `just check`, and a smoke of chapter cards on the affected Learn pages with `bezeg-smoke` Haiku `medium`, using `$smoke-tester` at `.agents/skills/smoke-tester/SKILL.md`. No browser check of the cards has run.
5. Mark the spec row "Example card images" done. Add the [evaluation entry](../../../.agents/skills/subagent-flow-evaluation/SKILL.md#do-log), not yet recorded; see below.
6. Optional cleanups: handoff 1, item 4, unchanged. Delete `origin/worktree-stream-closeout` only after its commits are on `master`: remote branch deletion is listed for the owner.

## For the evaluation entry

- Four chapter workers, one at a time, 120k to 147k each. The last two stopped at the budget: `probability` (5 cards) and `b-splines` (6). One chapter is about the limit for a Sonnet worker. Ordering wiring first did help: `b-splines` left less undone.
- Handler errors passed on through briefs: a worker's unverified claim about captions went into the next brief; `counts` was given as `points.length`, and is `[curveCount, types.point]`. The first was found by the next worker and the second by the test. Lesson: verify a claim before putting it in a brief.
- Handler viewing still found what workers and tests did not: an omitted handle, a false "whole board", a false "to nothing", and grammar. Reviewers then found seven more alt and term notes and no mathematical error.
- A stale generator test and a wrong `counts` row were each caught only by rerunning checks after a partial return.

## For the owner

- The Slovenian board text "4 oglišč" on the subdivision scene should be "4 oglišča": existing app text in `sl.ts`, quoted exactly by the card alt. Fix the plural first if it changes, then the alt, and recapture that card.
- `fortune` rule: any horizontal curve above all sites passes, with no upper bound. Accepted by design, as the card has one such curve.
- The insertion card sits left of centre with empty space to its right. Nothing is cropped.
- `functionsCards` guards hand-typed numbers against the inventory, not the live board. Generators check only `steps[0]`.
- Handoff 2's owner items are unchanged: the two script test files run in no recipe or workflow; board label layout; old `chrome-headless-shell` processes; remote branch deletion.

## Settings

Handler Opus, `--permission-mode auto`; workers `bezeg-worker` Sonnet `medium`, review `bezeg-reviewer` Sonnet `medium`, narrow smoke `bezeg-smoke` Haiku `medium`. `gh` is not installed: read CI from `https://api.github.com/repos/efodx/bezeg-2.0/actions/runs?head_sha=<sha>` and parse the JSON. Each handler starts its successor with `claude --bg` and passes that rule on.
