# w2-p evidence (projective family, P and P2)

## Checks observed (P2)
- `just lint src/graphs/projective`: passed (after removing unused imports/const in CrossRatio, Pascal, PolePolar lesson tests).
- `just typecheck`: errors only in other workers' files (compgeo PointInPolygonGraph); none in projective.
- `just unit src/graphs/projective src/learning/content/projective src/learning/content/lessonMathNotation.test.ts`: passed in 59.3 s (2 workers), includes the projective lesson tests.
- Keys: every `projective_*` key in en.ts is used outside localization, and en/sl key sets are identical (comm/diff).

## Pascal readout
Visible text "Položaj N od 24"-style (`projective_k2_table_index`, 1-based, M = `DIRECTION_TABLE_SIZE`); `data-pascal-index` keeps the raw 0-based index.

## Observed failures under deliberate mutation (restored afterwards, diff-checked)
| New assertion | Mutation | Result |
|---|---|---|
| Pascal readout (PascalGraph.host.test) | rename `data-pascal-index` attribute | 1 failed |
| PolePolar off-grid rounding | drop `grid` prop and use `Math.ceil` in place | 1 failed (dropping `grid` alone or ceil alone passes: shared control snaps, then onCommit rounds) |
| PolePolar zero ideal direction | disable the zero check | 1 failed |
| FivePoint out-of-range refused | widen min/max to +-1000 | 1 failed |

## Test time
Before (P handoff): 63.9 s, 17 files, 242 tests. After: 59.3 s for the same projective files plus lesson tests and the notation test, machine under shared load, so not a clean comparison. Individual files 8-10 s each.

## Unverified
Smoke test, English UI beyond existing language-switch tests, `just build`.
