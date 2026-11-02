# Curves stream: handler handoff 23

Handler 23 wrote this on 2026-11-02, replacing [handoff 22](handler-handoff-22.md). It stopped at the 150k soft threshold. Nothing is running: no workers, preview servers or temporary worktrees. Settings are unchanged:

- Handler: Opus, `--permission-mode auto`, `--effort medium`.
- Workers: `bezeg-worker`, Sonnet, `medium`.
- Reviews: `bezeg-reviewer`, Sonnet.
- Smoke: `bezeg-smoke`, Sonnet.

Briefs: [handler-23-briefs](handler-23-briefs/).

## Accepted and pushed to master this session

| Commit | Slice | Checks |
| --- | --- | --- |
| `0d90334c`, `2aa330ba` | Handoff 22's BS-A-5a readout and window fix, and IA-A-2c (I2 graph core) | Broad unit run of `src/graphs src/localization src/analysis src/learning`. Its only failures were the 2 `PresetCatalog` tests that IA-A-2d fixes. |
| `7819f4d4` | IA-A-2d: `interp-runge` registered at `/bezeg-2.0/interpolation/runge` | Unit, tsc, lint, build; browser smoke sl/en (live switch, keyboard, 390×844, 200% text) shows the spec maxima |
| `bbcd8a34` | BS-A-5b: joint poster capture of all 7 `POSTER_PENDING` ids plus `interp-subdivision` (now round 1); `POSTER_PENDING` is empty | Capture test 36/36; demonstrations and motion smoke; posters checked by eye |
| `380b2a0e` | CI fix: `src/Routes.test.tsx` route count 82 (missed by IA-A-2d) | Hosted CI green at `1dfddf0c` |
| `f9aa2588` | IA-A-3b: I2 guided lesson | Worker unit, tsc and lint; Sonnet engineering review, no blocking findings; `smoke-lesson interp-runge` passed (sl, and en at 390×844) |

Before pushing the lesson, the handler did not rerun a full unit suite on the combined tree; it ran the worker's paths plus the smoke. The successor checks hosted CI for the lesson push first (`gh run list --branch master --limit 3`). If CI is red because of Curves, fix that before pushing anything else.

## Next steps, in order

1. **Check CI** for the IA-A-3b push (above).
2. **BS-A-6, the B-spline Batch A gate.** It covers the spec's Batch A criteria, `just check` once, smoke of `/bspline/basis`, `/bspline/deboor` and `/learn/b-splines` in both languages, and hosted CI. Record the result in `docs/tasks/b-splines-nurbs/README.md`. Memory is short: run `just check` alone, with no worker active.
3. **I4 least squares graph** (`G-FN`, Batch B of the interpolation family, IA-B-*), then the family 4 graphs, per handoff 18.
4. **Interpolation chapter (F4).** I1, I2, I3 and I5 lessons are owned interim by `bezier-curves/geometric-properties` (`guidedLessonOwnership.ts`). The family's own chapter `interpolation` moves them.
5. **Deferred, low priority:**
   - On `interp-runge` at 390 px the board's node-rule label is clipped; at 200% text the function select is truncated.
   - IA-A-2c's fixed help-element ids would duplicate with two instances.
   - Handoff 21 item 5.

## Notes

- Rebasing the lesson onto Geometry's point-set-triangulation lesson (`dccdf58a`) gave mechanical conflicts in three lesson lists, resolved by union. Both sides had raised the `guidedExamplePreviewCopy.test.ts` counts, so they were corrected to 81 and 88. Rechecked: tsc, the conflicted and lesson unit files, and `smoke-lesson interp-runge point-set-triangulation`.
- The registration worker did not run `src/Routes.test.tsx`. Future registration briefs must list it.
- Low memory killed both a background check and the context watcher once. Run heavy checks in the foreground, one at a time.

## Evaluation record (not yet logged with `do-log`)

- IA-A-2d worker, Sonnet medium, v12: 51k tokens, 29 tools, about 11 min. Complete apart from missing `Routes.test.tsx` (an escaped defect, caught by hosted CI).
- Smoke worker, Sonnet: 31k tokens, 15 tools, about 4 min; accurate, with useful cosmetic findings.
- BS-A-5b capture worker, Sonnet medium: 63k tokens, 49 tools, about 10 min; fixed 3 recipe windows itself, and all posters were good.
- IA-A-3b lesson worker, Sonnet medium: 116k tokens, 41 tools, about 21 min. It strengthened its own vacuous prose-number test after a mutation. It also reported 2 spec mismatches, both correct readings.
- Review, Sonnet `bezeg-reviewer`: 32k tokens, 5 tools, 26 s, no blocking, 2 nits.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-23.md under AGENTS.md.
