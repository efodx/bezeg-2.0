# 07 — Interval graph mode (C1)

Status: planned 2026-11-01 (geometry handler 11). Source: [spec C1](../../specs/sweep-algorithms-lessons.md#c1-sweep-as-an-idea) capabilities ("interval mode (add, drag ends, snap)"), common criteria C-5 and C-6, [implementation decisions](../../specs/sweep-algorithms-lessons.md#implementation-decisions) (graph classes, Preset validation). Kind: F2a (no route), engineering plus UI/accessibility review. Depends on 04 (segment-set mode) and 05 (`Interval`, refusals).

## Decision (handler, 2026-11-01)

Intervals are a fourth `PointSetMode`, `'intervals'`, built like segments mode: `points` holds the endpoints as pairs \((p_{2k},p_{2k+1})\), and both points of interval \(k\) lie on row \(y=k+1\) (vertical offset, spec step 1). Only \(x\) is editable: drag and arrow keys move an endpoint horizontally, and the stored \(y\) is rewritten from the index after every edit, add and remove, so it is never user data. `intervalsOf(model)` returns `{lo, hi}` sorted per pair. Alternative: a separate one-dimensional model and graph. Rejected for the same reason as 04 (one owner of editing, snapping, Presets and disposal); a horizontal-only segments mode would mislead learners into editing a \(y\) that the sweep ignores.

## Scope

1. **Model** (`pointSetModel.ts`): `'intervals'` mode allowed only with an `allowIntervals` option (convexity and segment Presets unchanged); `addInterval`, `removeInterval`, endpoint edits that keep the row invariant; limit `SWEEP_MAX_INTERVALS` (10) and the sweep coordinate range, refused with the existing reasons; `parsePointSetModel` refuses an odd count and rows that do not match the index.
2. **Graph** (`PointSetGraph.tsx`): intervals drawn as horizontal segments on their rows with a label \(a,b,c,\ldots\) and the \(x\)-axis as the number line; vertical arrow keys do nothing on an interval endpoint; an "add interval" action for keyboard users. Owned board objects disposed as in 04.
3. **Inspector** (`PointSetControls.tsx`): a protected hook beside `allowsSegments()`, default off; numeric fields \(lo,hi\) per interval; remove-interval button.
4. **Localization:** one key block after the `pointset_*` segment keys, same position in `sl.ts` and `en.ts`. Slovenian *interval*, *krajišče*.
5. **Tests:** model unit tests (row invariant after every edit, limits, parse refusals); host tests in the style of `PointSetSegments.host.test.tsx`: board objects match the model after add, drag, nudge, remove, Preset round trip, Reset and a live language switch; disposal leaves no board objects or listeners; existing point-set, segment and convexity host tests stay green unmodified. Observe each new assertion fail against a deliberate mutation.

Stored Presets and routes valid at HEAD must keep working.

Not in scope: the sweep trace display and lesson (later S1 slices).

Checks: `just unit src/compgeo/pointSetModel src/graphs/compgeo --maxWorkers=2`, `just lint` on touched files, `npx tsc --noEmit --pretty false`, `just build`.
