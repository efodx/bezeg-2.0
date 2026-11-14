# G07 model and data slice: worker notes

Scope: G07-a, G07-b (model side), G07-d, G07-e, acceptance 2, 3, 4 (model), 5 (model), 6 (measurement), 7 (model tests). The graph, inspector and localization are the next slice.

## Decisions

- `EPICYCLE_EXAMPLE_IDS` now lists the three loops then the three outlines (`slovenia`, `cat`, `blossom`); `EPICYCLE_LOOP_EXAMPLE_IDS` is the old three. The old tests loop over `EPICYCLE_EXAMPLE_IDS` and pass unchanged, now also over the outlines. `src/learning/model.ts` uses `EPICYCLE_EXAMPLE_IDS` as the scene value list, so lessons can choose an outline too.
- Default N of an outline: 20 (41 circles). The N = 20 partial sums are recognisable for all three (see the pictures); N = 50 stays the limit. `chooseEpicycleExample` keeps the model's N, so the default only applies to a fresh outline model.
- Serialization: an outline model is stored as the model object itself, `{vertices, spans, N, parametrization, outline}`. The vertices are redundant (about 6 KB of JSON for 200 points) and are ignored on load: `checkEpicycleModel` rebuilds them from shipped data. A preset may also omit `vertices` and `spans` and store just `{outline, N, parametrization}`. Where presets serialize the model (EpicycleGraph, not edited) is for the next slice to check.
- New issues: `{kind: 'outline', allowed}` (unknown, null or non-string `outline` id) and `{kind: 'fixed-outline'}` (vertex or control edit on an outline). Both are data only; messages are the next slice.
- Evenness is measured on chords: the generator relaxes the resampled points along the path until all chords are equal, so the shipped polygon's edges are even (arc-length resampling alone shortens chords at corners).

## Sampled maximum error (equal parametrization, 2000 samples), max |z - S_N|

| Outline | N = 5 | N = 20 | N = 50 |
| --- | --- | --- | --- |
| slovenia | 0.2996 | 0.1195 | 0.0394 |
| cat | 0.5045 | 0.0777 | 0.0332 |
| blossom | 0.3657 | 0.0233 | 0.0051 |

The outlines span 5 units, so 0.04 is under 1 percent of the extent.

## Recognisability (pictures: `slovenia.svg`, `cat.svg`, `blossom.svg` here)

- slovenia: N = 20 shows the country (the eastern lobe, the Istrian notch, the western edge), a smoothed version; N = 50 adds the coast and border detail. Recognisable at both; N = 50 clearly better.
- cat: N = 20 shows a head with two ears, the neck, body, paw notch and the curled tail; ears slightly rounded. N = 50 sharpens the ears and the tail tip. Recognisable at both.
- blossom: a five-lobed shape, exact to the eye from N = 20; N = 5 is a rounded pentagon.

## Measurement (acceptance 6; Node 24, median of 20, this machine, shared and busy)

| Outline | analyzeEpicycle | epicycleTrace N = 50 |
| --- | --- | --- |
| slovenia (200) | 178.8 ms | 7.95 ms |
| cat (160) | 138.6 ms | 7.76 ms |
| blossom (200) | 181.5 ms | 7.84 ms |

`analyzeEpicycle` runs once per loop or parametrization change and must not run per frame or per time-slider move (180 ms is more than ten frames). `epicycleTrace` at 8 ms per call is not per-frame work either at 60 fps with other drawing; it depends on N only and is recomputed on an N change, not on time. The moving circles of a time step need only `epicycleChain` (about 100 terms).

## Data sources

See `scripts/epicycle-outlines/README.md`. Natural Earth 1:10m Admin 0 Countries (public domain), downloaded from the nvkelso/natural-earth-vector GitHub mirror into `.command-logs/ne-g07/` and parsed by `generate.cjs` only. The cat is an original path (`cat-path.cjs`).

## Not verified

No browser or graph checks (not in scope); the typecheck result for the graph slice is in the report. Failure-before-implementation of each new assertion was not observed: the implementation was written before the tests.
