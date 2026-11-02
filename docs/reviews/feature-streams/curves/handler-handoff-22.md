# Curves stream: handler handoff 22

Handler 22 wrote this on 2026-11-02. It replaces [handoff 21](handler-handoff-21.md). The handler stopped at the 150k soft threshold. Nothing is running: no workers or temporary worktrees. A `just preview 3012` server started by a worker may still be running; its stop was denied to the worker, and the handler left it for the owner. Settings are unchanged:

- Handler: Opus, `--permission-mode auto`, `--effort medium`.
- Workers: `bezeg-worker`, Sonnet, `medium`.
- Reviews: `bezeg-reviewer`, Sonnet.
- Smoke: `bezeg-smoke`, Sonnet for a first pass, Haiku for narrow checks.

## Branch state: committed, pushed to the branch only, NOT on master

Branch `worktree-stream-curves` on `origin` holds the two commits below and this note. They are **not on `master`**, because the system stopped the broad unit run and the build for low memory before they finished (no failure in the partial log). The successor reruns them first.

| Commit | Slice | Checks run |
| --- | --- | --- |
| `d5d8b6a7` | BS-A-5a follow-up: the de Boor and basis board readouts joined lines with `"\n"`, which board HTML collapses into one paragraph, both in the app and in posters; they now use `<br>` (as `CurvatureOverlay.ts`). The `bspline-basis` and `bspline-deboor` recipes get a framing window. Window mode hides board texts over 65 characters (`capture-demonstration-previews.cjs:204`), so the posters show the construction without the readout. | `just unit src/graphs/curves/bspline` 77/77; reverting the scene fix fails the two new assertions. Local partial captures (`PREVIEW_IDS=bspline-deboor,bspline-basis` with a throwaway preload that clones `bezier` as `simson-line`, outside the repo): de Boor shows the control polygon, both level-1 points and the level-2 point on the curve; basis shows the three functions, parameter line, knot multiplicities and the domain note; no overlap. `node --test scripts/demonstration-preview-capture.test.cjs` 35/36 (only the known `simson-line` failure). |
| `8a5fbbd6` | IA-A-2c: `interp-runge` graph core (I2), first `G-FN` slice. [Evidence](../../interpolation-approximation/ia-a-2c-graph.md). No route, registration or lesson. | Worker: unit, tsc, lint, 7 mutation checks. Sonnet engineering review (no blocking) and mathematics review (spec table recomputed; one medium: semicircle drawn as an ellipse). Handler repairs: semicircle scaled by `unitX / unitY` with a mutation-checked test, the note copy corrected (SL, EN), exhaustive edit message, named marker limit. Handler: `just unit src/graphs/functions/RungeInterpolationGraph` 18/18, `npx tsc --noEmit` and `just lint` pass on the final tree. The build passed before the last two repairs. |

## Next steps, in order

1. **Finish verification, then push to master.** `just unit src/graphs src/localization src/analysis src/learning` (or `just check`) and `just build`. Then `git fetch`, rebase the three commits onto `origin/master`, recheck, and push `HEAD:master`. Expected collision points: `sl.ts`/`en.ts` key blocks, `functionPresetCollections.ts`, the recipes file.
2. **BS-A-5b, the joint poster capture**, unchanged from handoff 21 item 1. It still waits for the maps `simson-line` recipe: `git fetch && git show origin/master:scripts/demonstration-preview-recipes.cjs | grep -n simson-line`. Handoff 21 item 2 (frame check) is done by `d5d8b6a7`; the joint capture will publish these windows.
3. **BS-A-6, the Batch A gate** of the B-spline family, after BS-A-5b (handoff 21 item 3).
4. **IA-A-2c follow-ups for I2 registration (IA-A-2d / F2b):** route `/interpolation/runge`, catalog entry, browser check in SL and EN with the live switch, keyboard and touch, text enlargement. The lesson (IA-A-3-style, F3) follows. Owner has not reviewed the Slovenian words `mreža` (grid) and `vozliščni polinom` (node polynomial); per AGENTS.md the handler decides new terms, and both are standard.
5. **I4 least squares graph** (`G-FN`, Batch B of the family) and family 4 graphs, per handoff 18.
6. **Deferred low-priority items**: handoff 21 item 5; IA-A-2c fixed help-element ids would duplicate with two instances.

## Notes

- If the system is short on memory, run heavy checks one at a time and do not run two Vitest runs at once.
- The recipe tuple's fourth element is a framing window, not a camera: it hides long board texts.

## Evaluation record (not yet logged with `do-log`)

- IA-A-2c worker, Sonnet medium, v12: complete in one pass (108k tokens, 40 tools, about 11 min). It found the cache-key issue itself (base caches key on the whole model). Missed: the semicircle aspect (caught by the mathematics review) and a false copy claim (caught by the handler).
- Capture worker, Sonnet medium, v12: 24k tokens, 12 tools, about 1.5 min; accurate frame description. Its preview-server stop was denied.
- Reviews, Sonnet `bezeg-reviewer`: engineering 29k / 8 tools / 59 s, no blocking, 3 minors; mathematics 32k / 8 tools / 43 s, one valid medium.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-22.md under AGENTS.md.
