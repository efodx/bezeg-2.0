# Batch 1 browser smoke: B-spline and projective scene lifecycle

## Scope and environment

- Checkout: `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\stream-authoring-rollout`
- Revision: `6ceae2eb2605a5dd7aa795c722036f7625f83532` (HEAD, not pushed)
- Working tree: **dirty**. Uncommitted edits exist in `src/graphs/curves/hermite/HermiteGraph.tsx`, `HermiteScene.ts`, `src/graphs/curves/interpolation/InterpolationGraph.tsx`, `InterpolationScene.ts` and `docs/specs/lesson-authoring-rollout.md`. These were not made by this run. The production build (`just build`, "dirty") and the smoke run therefore include those edits. None of the seven routes under test is in those files, but the run does not verify a clean HEAD.
- Build: `just build` passed (6.1 s). A first build recorded "clean"; the working tree changed before the smoke run, so the build was re-run and recorded "dirty".
- Preview: `just smoke-built`, which starts its own loopback preview on the production build. Port 4323 was already held by another checkout's preview (`stream-families-prep`, `scripts/serve-smoke-build.cjs`, PID 19508). That process was not stopped. The run used `SMOKE_PORT=4331` instead.
- Browser: Playwright Chromium, 5 workers, test slot 1/2. Elapsed time for the smoke run: 23.1 s.
- Cleanup: the smoke recipe disposes its preview. No processes were started by this run.

## Routes

| Route id | Path | Graph class |
| --- | --- | --- |
| `bspline-basis` | `/bezeg-2.0/bspline/basis` | BSplineBasisGraph |
| `bspline-deboor` | `/bezeg-2.0/bspline/deboor` | DeBoorGraph |
| `bspline-insertion` | `/bezeg-2.0/bspline/insertion` | BSplineInsertionGraph |
| `bspline-extraction` | `/bezeg-2.0/bspline/extraction` | BSplineExtractionGraph |
| `projective-cross-ratio` | `/bezeg-2.0/projective/cross-ratio` | CrossRatioGraph |
| `projective-pascal` | `/bezeg-2.0/projective/pascal` | PascalGraph |
| `projective-pole-polar` | `/bezeg-2.0/projective/pole-polar` | PolePolarGraph |

## Command run

`SMOKE_PORT=4331 just smoke-built --grep "bspline-basis|bspline-deboor|bspline-insertion|bspline-extraction|projective-cross-ratio|projective-pascal|projective-pole-polar"`

Result: 21 passed, 0 failed, 0 skipped. Log: `.command-logs/2026-11-12T08-12-41-371Z-29872-c51fe18f.log`.

## Per-route results

| Route | Demonstration load (heading, graph, inspector) | Lesson walk sl `?learn=1` (every frame, pointer Next) | Lesson walk en 390px (overflow, point visibility) | Drag, preset, Reset, playback |
| --- | --- | --- | --- | --- |
| `bspline-basis` | passed | passed | passed | not covered |
| `bspline-deboor` | passed | passed | passed | not covered (playback not covered) |
| `bspline-insertion` | passed | passed | passed | not covered |
| `bspline-extraction` | passed | passed | passed | not covered |
| `projective-cross-ratio` | passed | passed | passed | not covered |
| `projective-pascal` | passed | passed | passed | not covered |
| `projective-pole-polar` | passed | passed | passed | not covered |

The lesson walk specs fail on page errors and console errors (`tests/lesson-smoke-helpers.cjs` collects `pageerror` and `console` messages). The seven lesson walks passed, so no runtime error was recorded during them. The demonstration load spec does not check console output.

## Coverage gaps (not executed)

The brief's manual steps were not run, for these reasons:

1. **Point or knot drag with curve/construction update**: no existing spec covers drag on these seven routes. `workflows.smoke.spec.cjs` and `curve-editing-modes.smoke.spec.cjs` target Bezier curves only. Not covered.
2. **Preset change and return, Reset**: `workflows.smoke.spec.cjs` covers preset save/reopen on Bezier only. No preset-menu or Reset check exists for these routes. Not covered.
3. **DeBoor playback start/stop**: no spec covers it. Not covered.
4. **Learn-chapter link from the Demonstration to the lesson and back**: the lesson walks open the lesson directly with `?learn=1`. The link path and the return to the Demonstration were not exercised. Not covered.
5. **Projective Preset export and import round-trip**: not covered. The smoke tooling provides no preset export/import check for these routes, and this run did not add one.
6. **Stale objects on the board after scene changes or redraw failures**: not observed, because the interactions above were not run. Not covered.

Running these steps would need a new or ad hoc Playwright script, which the brief's constraints (just recipes only, write only this report) did not allow. A follow-up with an authored spec is needed to close gaps 1 to 6.

## Failures

None observed in the covered checks.
