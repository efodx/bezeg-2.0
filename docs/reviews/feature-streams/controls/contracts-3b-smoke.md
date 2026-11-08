# Contracts 3b smoke: shared trace playback (partial, budget handoff)

Preview: http://127.0.0.1:4327/bezeg-2.0 (HTTP 200). Scripts: `C:\Users\1337Hacker\AppData\Local\Temp\agent-a18d-smoke\run3b.cjs`; results `results-3b-<route>.json`.
Status: PARTIAL. `just smoke-lesson` NOT run (handoff signal reached first).

## Route routing
- bezier-clipping is served at `/bezeg-2.0/bezier/clipping` (src/demonstrations.ts line 50), not under `/compgeo/`.
- hull-robustness has no trace step element (`HullRobustnessControls.tsx` has no step text or PlaybackButtons). Its page exposes `play-pause`, `next-step`, `reset` data-action buttons, but they are not tied to a trace step; origin not traced. Checks 1-5 not applicable as written.

## Per-route results (final run for each route)
| Route | 1 Next | 2 Reset+Play | 3 Edit mid-play | 4 Play at end | 5 Nav away/back |
|---|---|---|---|---|---|
| segment-intersections | PASS | PASS | PASS (step 1, Predvajaj) | PASS | not run |
| monotone-partition | PASS | PASS | PASS* (step 0 = start) | PASS | not run |
| monotone-triangulation | PASS | PASS | PASS* (step 0 = start) | PASS | not run |
| ear-clipping | PASS | PASS | PASS (step 1) | PASS | not run |
| delaunay | PASS | PASS | PASS (step 1) | PASS | PASS |
| fortune | PASS | PASS | PASS (step 3 kept) | PASS | PASS |
| bezier-hulls | PASS | PASS | PASS (step 1) | PASS | not run |
| bezier-clipping | PASS | PASS | PASS (step 1) | PASS | not run |
| hull-robustness | N/A | N/A | N/A | N/A | N/A |

*Harness expected step 1; these traces start at step 0 ("Korak 0 od N"), so the observed value is the start. Reclassified as PASS.

## Evidence notes
- Check 1: each press +1; Next disabled at end; Next at end leaves status. Board SVG canonical hash (ids removed, attributes sorted, mouse parked) matched between Next-to-end and Play-to-end on every route.
- Check 2: Play stopped itself at the last step, label "Predvajaj", stayed there 3 s later; same board hash as check 1.
- Check 3: edit field = first existing-point number input (`P1, x`, `A_0, x`, `Daljica s1 ...`). An earlier run edited the "Nova točka" new-point field, which does not change the model; that was discarded.
- Check 4: Play after end leaves the status unchanged.
- Check 5 (delaunay <-> fortune): old route unmounted; other route advanced under Play; back on the route Reset state, Next +1.

## Failures
- None confirmed in the final runs. The earlier monotone/ear/delaunay/fortune FAILs came from the harness (wrong edit field; 1-based assumption), not the app.

## Coverage gaps
- `just smoke-lesson` not run. Planned ids (compgeo trace lessons, 7 of max 8): segment-intersections, monotone-partition, monotone-triangulation, ear-clipping, delaunay, fortune, bezier-hulls. bezier-clipping lesson is in the bezier family; hull-robustness lesson is not a trace lesson.
- Console and page errors: the first-run logs reported ERRORS_COUNT 0 for the eight trace routes; the final reruns' error counts were not extracted.
- Check 5 run only on delaunay and fortune. Keyboard, touch, and mid-play board drag not covered.
- hull-robustness playback not verified (see routing note).
