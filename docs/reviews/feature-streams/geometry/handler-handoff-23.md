# Geometry stream: handler handoff 23

Written 2026-11-02 by handler 23 (Opus 5.5, auto, effort medium), a supervisor relaunch after handler 22 crashed, at the 150k soft threshold. Continues [handoff 22](handler-handoff-22.md). Stream file: [geometry](../../../tasks/feature-streams/geometry.md).

## Where things are

- Branch `stream-geometry` = `origin/master` `fb1d09e1` plus this note. Sources clean; no worker, preview or watcher of this session is running.
- **Accepted and pushed this run:**
  - **Sweep 13, F4 chapter `sweep-algorithms`** (pushed up to `2c0faf56`). The rebase conflicted with Maps' triangle-geometry chapter in the Learn lists. The conflicts were mechanical; I kept both sides and placed sweep after `triangulations-voronoi`. After highlights 05a, a fix commit dropped `FamilyChapterFigure` from `sweepChapter.ts` and raised the Learn counts to 15 chapters and 79 audited homes. Checks: tsc, lint, `just unit src/learning` (1331 passed), build, `just smoke-lesson interval-sweep segment-intersections`, `tests/unified-learning.smoke.spec.cjs`, and a chapter-page check in both languages (`13s-chapter-check.cjs`/`.log`, 21/21: return link restores focus, live SL→EN switch).
  - **Posters for all 24 pending ids from every stream** (`fb1d09e1` feat plus a docs commit). `POSTER_PENDING` is now `[]`, and the Learn thumbnails count is 15. The capture was selective, with both preserve flags (reasons in the stream file); existing posters are byte-identical. `projective-cross-ratio` was added to `LINE_DEFINED_IDS`. Checks: `node --test scripts/demonstration-preview-capture.test.cjs` 36/36, the poster/Learn unit tests, build, and the `demonstrations`/`demonstration-motion`/`home` smoke specs passed. Per-id visual list: `posters-visual.md`. A note to Curves in the stream file covers the `interp-subdivision` caption mismatch.
  - **Not done:** the evaluation (do-log) record for the poster worker. It was a Sonnet `bezeg-worker` on medium effort: 58k tokens and 35 turns, one stop on a recipe assertion that the handler resolved, and the final hand-back was not delivered.

## Remaining, in order

1. **Hosted CI on `fb1d09e1`.** Master CI was already red before this run, from other streams' commits: the unit shards failed (`GraphTransientState.part3` and `window.matchMedia is not a function`), and the smoke job also failed. The `2c0faf56` run was cancelled. Check that none of the remaining red rows involve sweep 13 or the posters. The catalogue, preview-mapping and motion-poster rows should now be green. Fix any failure Geometry caused before pushing anything else.
2. **F6 for T1 (B1 ear clipping) and sweep S1 (C1, C2).** Run the spec acceptance gates, `just check` once at a stable checkpoint, smoke the family routes in both languages, and confirm hosted CI after the push. Posters no longer block this.
3. **Test-only slice:** bound the remaining `while (...) click('next-step')` loops listed in handoff 22's Risks.
4. Then the next batches, triangulation T2 and sweep S2, per their READMEs.

## Risks

- Memory: free RAM was 1.2–2.8 GB with three other handlers busy. A full `src/learning` unit run took about 10 minutes. Run heavy checks one at a time.
- After a capture, `src/demonstrationMotionAssets.ts` can show a CRLF-only change. Check `git diff --ignore-cr-at-eol` before restoring it, and never stage it.

## Settings to keep

Opus handler, permission mode auto, effort medium. Workers: `bezeg-worker` Sonnet medium, one at a time. Reviews: `bezeg-reviewer` Sonnet.
