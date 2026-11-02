# Curves stream: handler handoff 21

Handler 21 wrote this on 2026-11-02. It replaces [handoff 20](handler-handoff-20.md). The handler stopped at the 150k soft threshold after BS-A-5a and has nothing running: no workers, previews or temporary worktrees. Settings are unchanged:

- Handler: Opus, `--permission-mode auto`, `--effort medium`.
- Workers: `bezeg-worker`, Sonnet, `medium`.
- Reviews: `bezeg-reviewer`, Sonnet.
- Smoke: `bezeg-smoke`, Sonnet for a first pass, Haiku for narrow checks.

Branch `worktree-stream-curves` holds the commit of this note, and it is pushed to `origin/master`.

## Accepted and pushed to master

| Commit | Slice | Checks |
| --- | --- | --- |
| `a6f53776`, `1d39233c` | BS-A-4: chapter `b-splines` owns L1 and L2. **Breaking:** the interim example ids `lesson.splines.piecewise.bspline-*` stopped resolving. [Evidence](../../b-splines-nurbs/bs-a-4-chapter.md). | A worker with mutation evidence. The handler checked the mathematics by hand and fixed three wording points. Full `just unit src/learning`, tsc, lint and build passed, then smoke of the `b-splines`/`splines` chapters (2/2) and both lesson rows (4/4). Handler Playwright check: SL, the live switch to EN, MathJax and the Learn card. A Sonnet engineering review found nothing. After two rebases over geometry and maps commits, the affected units and tsc passed again on `1d39233c`. |
| `c6dd85a9` | BS-A-5a: three curves poster recipes for the joint capture, and the capture script's `git diff` split into chunks to fix Windows `ENAMETOOLONG`. No media published. | A worker partial capture (`PREVIEW_IDS`, with a throwaway preload that cloned a recipe as `simson-line`) produced good frames for `interp-subdivision` (step 1, 8 vertices) and `bspline-basis`. The handler then added `button('Naslednja raven', 2)` for `bspline-deboor`, but that frame has not been captured yet. `node --test scripts/demonstration-preview-capture.test.cjs` passes 35 of 36. The one failure is the missing `simson-line` recipe, which already fails on master. |

## Next steps, in order

1. **BS-A-5b, the joint poster capture.** A full publish requires every active Demonstration to be captured. These six ids are still pending: `bspline-basis`, `bspline-deboor` (curves), `euler-line` and `simson-line` (maps), and `point-set-triangulation` and `delaunay` (geometry). `simson-line` has no recipe yet, and the maps stream owns it.
   - Wait for it: `grep -n "simson-line" scripts/demonstration-preview-recipes.cjs`.
   - Then recapture all six together, plus `interp-subdivision`, with `PREVIEW_RECAPTURE_IDS`, `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1` and `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1` (geometry [handoff 29](../geometry/handler-handoff-29.md) item 1).
   - The chunking fix should make the geometry worker's preload shim unnecessary.
   - Remove the ids from `POSTER_PENDING` and from `DemonstrationsPage.test.tsx:46`.
   - Raise the Learn thumbnail count in `LearningPage.test.tsx` from 18 to 19.
   - Coordinate with the other two streams so only one of them runs the capture.
2. **Check the `bspline-deboor` frame** for the full triangle. The `bspline-basis` frame has a two-line caption overlapping the plot, with "vsota" colliding with a curve. Consider a field or viewport tweak, then run a Haiku visual comparison.
3. **BS-A-6, the Batch A gate.** It covers the spec's Batch A criteria, `just check`, smoke of `/bspline/basis`, `/bspline/deboor` and `/learn/b-splines` in both languages, and hosted CI.
4. **`G-FN` work** (I2/I4, family 4), per handoff 18.
5. **Deferred low-priority items.**
   - Carried from handoff 20, item 4.
   - BS-A-4: narrow viewport and text enlargement of the chapter are unchecked.
   - BS-A-5a: no unit test for the chunked `git diff`.

## Notes

- Master moves every few minutes. Run `git fetch` right before each push; this handler had to rebase twice. Collision points this time were `familyChapters.test.ts`, chapter counts, `guidedLessonOwnership.ts` and `lessonCatalog.test.ts`.
- With a live language switch, the chapter page has fewer `mjx-container` nodes than after a direct load. The Fourier chapter does the same, the math still renders, and no `\(` delimiters remain unrendered. This is not a defect.

## Evaluation record (not yet logged with `do-log`)

- BS-A-4 worker, Sonnet medium, v12: complete in one pass (82k tokens, 31 tools, about 14 min). It found the `familyInvestigation` requirement itself. It ended on focused reruns, not the full folder. The handler found two wording issues and one stale comment.
- BS-A-4 review, Sonnet `bezeg-reviewer`: 27k tokens, 6 tools, 29 s; no findings. Its one docs-only note was already handled.
- BS-A-5a worker, Sonnet medium, v12: 37k tokens, 23 tools, about 4 min. It worked around the `simson-line` block with a throwaway preload outside the repo. It reported, but did not fix, the de Boor frame showing only level 0.
