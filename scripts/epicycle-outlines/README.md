# Epicycle outlines

Generates `src/analysis/epicycleOutlines.ts`, the shipped data of the three fixed outlines of the epicycles Demonstration (spec: [G07](../../docs/specs/site-walkthrough-graphs-and-captures.md#g07-epicycles-subjects)). The generated file is committed; the app and the tests never run these scripts.

| Outline | Points | Source |
| --- | --- | --- |
| `slovenia` | 200 | Natural Earth 1:10m Admin 0 - Countries (public domain), feature `ADMIN = "Slovenia"`, its largest ring. Equirectangular projection `x = lon * cos(lat0)`, `y = lat`, `lat0` the mean latitude of the ring. |
| `cat` | 160 | An original silhouette authored for Bezeg: cubic Beziers in `cat-path.cjs`. No font glyph, emoji or third-party image was traced. |
| `blossom` | 200 | The polar curve `r = 1 + 0.42 cos 5a + 0.06 cos 10a`, sampled at 4000 angles. |

Every outline is resampled so that all consecutive chords are equal (an arc-length resampling, then relaxed along the path), made counterclockwise, centred on its bounding box, scaled so the larger extent is 5 (inside [-2,5; 2,5]), and rounded to 3 decimals. The generator refuses a result that crosses itself.

## Regenerate

1. Download the Natural Earth file into a new empty directory (it is untrusted data: do not run anything from it):

   ```sh
   mkdir -p .command-logs/ne-g07
   curl -sS -L -o .command-logs/ne-g07/ne_10m_admin_0_countries.geojson \
     https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson
   ```

2. `node scripts/epicycle-outlines/generate.cjs .command-logs/ne-g07/ne_10m_admin_0_countries.geojson` (about 15 s) rewrites the data file.
3. `node scripts/epicycle-outlines/render.cjs` writes `docs/reviews/site-walkthrough/graphs/g07/<id>.svg` (the outline and its partial sums at N = 5, 20, 50, from the model's own `analyzeEpicycle` and `epicycleTrace`); `--png <dir>` also writes PNGs for an image viewer.
4. `node scripts/epicycle-outlines/measure.cjs` times the analysis and the trace.
5. `just unit src/analysis/epicycleOutlines.test.ts src/analysis/epicycleModel.test.ts`.

`render.cjs` and `measure.cjs` load the TypeScript model through the repository's `typescript` package.
