# Maps stream: handler handoff 10

Written 2026-11-01 by handler 10 (Opus 5.5, `auto`, effort `medium`) after the 150k context threshold. Gates: `G-REG` and `G-CG` open, `G-HL` closed. `Run state: active`. Worktree `.claude/worktrees/stream-maps`, local branch `worktree-stream-maps` = `origin/master` after this note's commit.

## Git state

- On `origin/master` from this run:
  - `caa51161`: complex 04 F3+F4, lessons M1/M2 and the *Kompleksne preslikave* chapter;
  - `b3db5be9`: the Learn smoke chapter list now includes `complex-maps`;
  - `dd2cfc08`: complex 04 F5 example cards and poster recipes;
  - this note.
- `origin/maps-handler-9-f3f4` is superseded by `caa51161`. It and handler 8's branches (`maps-handler-8-wip`, `maps-handler-8-f2b`) are stale; delete them only if the owner asks.

## Done this run

- **F3+F4 accepted and pushed** (`caa51161`). The owner authorized resolving the rebase conflicts by keeping both sides:
  - kept: the other families' exemptions, the convexity chapter, and the curves families in `FAMILY_CHAPTER_PENDING`;
  - added: the complex-maps entries;
  - the union-of-family link check still honours `CHAPTER_LINK_PENDING` (ear clipping, sweep, intersections, Coons);
  - chapter order: linear maps, complex maps, convexity;
  - counts: 12 chapters, 74 authored references.

  Review results:
  - Engineering reviewer: stale Learn counts (11 to 12) and a stale comment in `guidedLessonOwnership.ts`. Both fixed.
  - Mathematical reviewer: every M1/M2 number and convention cleared. One fix: the Slovenian "Vsak se skubira v 2i" became "Kub vsakega je \(2i\)". Kept as is: the `'60^'` substring check in the labelling test, because numeric checks back it.
  - The reviewer did not read the F4 chapter prose or the preview copy.

  Checks at `1accb4fb` (pre-squash, same code):
  - tsc and `just lint` clean; build clean.
  - Full `just unit`: 7422 passed, 2 failed, both pre-existing on master (see CI).
  - Delegated browser smoke, checks 1–6 passed: route SL/EN, both lessons stepped in both languages, live switch, restore on exit (default scene only), `/complex-multiplication` unchanged, no console errors. Screenshots and report in `.command-logs/h10-smoke-f3f4/`.
  - `just smoke-lesson complex-roots complex-reciprocal`: 4/4 after fixing the roots row setup (step 1 shows only w, so at least 1 point, not 2).
- **Learn smoke fix** (`b3db5be9`): hosted CI at `caa51161` failed `unified-learning` "Learn opens chapters…" because of the hard-coded chapter list. Fixed but not yet re-observed in CI.
- **F5** (`dd2cfc08`, Sonnet worker, brief `docs/reviews/complex-maps/04-f5-brief.md`, notes `04-f5-worker-notes.md`):
  - Example cards: `complex-maps` entries in `chapterInventories`, `chapterFamilies` (route regex limited to the two complex routes) and `CHAPTER_GUIDED_EXAMPLE_PREVIEWS` via `complexMapsPreviewCopy.ts`.
  - Card expectations: reciprocal 3 curves, 3 points (z, w = 2+i, conjugate); roots 1 curve, 1 point (w).
  - Handler checked the reciprocal card against its copy.
  - Poster recipes added for both complex routes, so `scripts/demonstration-preview-capture.test.cjs` is green again.
  - Rechecked after rebasing onto the platform stream's commits: tsc, eslint, 56/56 node script tests, 67/67 focused vitest.

## Blocker: posters

`PREVIEW_RECAPTURE_IDS=linear-map,complex-reciprocal,complex-roots` captures the three posters but writes nothing. It stops at `scripts/capture-demonstration-previews.cjs:776` ("Capture order and exhaustive route metadata no longer match") because other streams' Demonstrations have no retained poster (curves: `curve-parametric`, `curve-curvature`, `interp-*`, `patch-coons`; compgeo ids). The run also needed `PREVIEW_RECAPTURE_PRESERVE_SOURCE_PROVENANCE=1` and `PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1`, because adding recipes changes the presentation fingerprint.

Options:
- (a) wait until the other streams' posters exist;
- (b) a full generation;
- (c) let the selective path tolerate missing retained posters for ids outside the recapture set. This is a tooling change across streams and needs the owner or the platform stream.

The two complex recipes' framing is not yet verified on a real poster.

## CI

At `caa51161`, browser smoke failed in:
- `unit (1)`: `Routes.test.tsx` route count 60 vs 66 (curves `2a6e9c4c`) and `CoonsPatchGraph` Presets. Both pre-existing, not maps.
- `other-specs`: catalogue cards, preview provenance, and the motion poster. All three fail because 15 Demonstrations have no posters (3 maps, the rest curves and compgeo).
- `unified-learning`: fixed in `b3db5be9`.

Deploy stays skipped until those clear. Check the next run with `gh run list --workflow browser-smoke.yml --branch master`.

## Next, in order

1. Confirm in hosted CI that `unified-learning` passes at `dd2cfc08` or later.
2. **Linear identity label overlap** (closes linear 07 F6 with the poster): a small label-placement fix in the linear map graph, then a focused browser check. Master's `ea265e10` changed `LinearMapGraph` (shared BoundingBox), so read the current code first. Screenshot of the overlap: `.command-logs/h9-smoke-f6/c1.png`.
3. **Complex 04 F6:** Batch A gate, `just check`, smoke of both routes and lessons in both languages with a live switch, `/complex-multiplication` unchanged, hosted CI. Smoke checks 1–6 above cover most of it at `1accb4fb`. Still open: a restore-on-exit check after a user edit, plus the posters.
4. **Posters** for `linear-map`, `complex-reciprocal` and `complex-roots`, once the blocker clears. Then drop the ids from `POSTER_PENDING` (`src/demonstrationPreviewAssets.test.ts:6`) and from `src/DemonstrationsPage.test.tsx:45`, and update the Learn thumbnail count in `LearningPage.test.tsx`.
5. **Triangle 05:** as in handoff 7.

## Observations (not blocking)

- M2 "labelling": the inspector's *Primer korenov* select still names the loaded preset (w=−1, n=2) after the scene sets n=3 and Im w=0.05. This is the general behaviour when parameters are edited after a preset is chosen.
- In M2 step 6 (SL) at 1440×900, the lesson overlay covers the top of the board.

## Settings to keep

Opus 5.5 handler, `--permission-mode auto`, `--effort medium`. Workers `bezeg-worker` Sonnet 5.5 `medium`; reviewers `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` Sonnet on port 4316. `just` heavy commands share one test slot across worktrees, and waits of 5–30 min are normal. Run a full `just unit` before a smoke worker needs the slot, or tell the smoke worker to wait for it.
