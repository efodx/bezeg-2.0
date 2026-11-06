# AB-B-2a2: D2 controls and inset

Handler 63, 2026-11-06. One Sonnet medium worker, plus handler review. Source: the [Batch B plan](../../tasks/advanced-bezier/README.md#batch-b-plan-d2-handler-62-2026-11-06) and spec D2.

## Delivered

- `BezierClippingControls`: tolerance select of eight powers of ten, playback, status, clip count, widest alive width, interval table.
- `bezierClippingReadout.ts`, pure: the six statuses and the bounded table, results first, at most eight rows and a "further \(n\)" row.
- `ClipDistancePlot`: the inset, written through a controller and fed from `syncScene`. It is memoised, so a drag renders no inset React.

No new Slovenian terms: *toleranca*, *debela premica* and *Bézierovo rezanje* are already in the catalog.

## Handler review

- The controls redeclared `TraceControlActions`; they now import it.
- The status lines said *ovojnici*. In this app *ovojnica* alone also means an envelope, so they now say *konveksni ovojnici*, as the catalog does.
- Table and select styling is inline, not in a stylesheet. Accepted for now; judge it in the AB-B-2b browser pass.

## Checks

- `just check` on the final tree except one assertion: typecheck and lint passed; unit 11 068 passed, 8 skipped, 1 failed. The failure was the test pinning the old *Ovojnici* wording. With the assertion updated, that file and `PresetCatalog.test.tsx` passed, 244 tests. `just build` passed afterwards in 4.5 s, so hosted CI is the real check of the build.
- Worker: readout status branches, the table on a real tangent run at \(10^{-10}\) with more than eight live entries, select, Reset, Preset restore, `set-clip-tolerance`, language switch, `aria-disabled`, the silent status region, inset path data after a step, a drag and a tolerance change, and the inset render count across a drag.

| Mutation | Observed failure |
| --- | --- |
| Table cap removed | 2 tests |
| Inset not fed on a tolerance change | 2 tests |
| `overlapping` always reported | 2 tests |

## Open

- No browser or visual review yet: there is no route until AB-B-2b.
- Whether the tangent pair at \(10^{-10}\) reaches `limit` was not observed; that test falls back to a constructed state. Read the real status in AB-B-2b, as lesson step 6 depends on it.
- `aria-label` on `<option>` varies by screen reader. The visible text is `10⁻⁶`.
