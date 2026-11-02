# 08 F2a slice 2 graph: worker 1 handoff (partial)

Stopped on the handler's HANDOFF. Nothing committed. Production code is written and `npx tsc --noEmit --pretty false` printed no errors (empty log). Nothing else has been run: no unit tests exist yet, no lint, no build, no browser or jsdom run.

## Files added or changed

Localization (71 `inversion_*` keys, inserted after the last `simson_*` key in both files, same order):
- `src/localization/sl.ts`
- `src/localization/en.ts`

New, in `src/graphs/compgeo/`:
- `inversionPresetCollection.ts`: key `compgeo-inversion`, `INVERSION_OVERLAY_IDS`, `INVERSION_FOCI`, `isInversionFocus`, `isInversionExampleId`, collection with graphState checks and data check (pointLimit 1, coordinateLimit 10, points mode, grid step 0).
- `inversionView.ts`: `buildInversionView`, places (`image`, `source-image`, `q-image`), `outsidePlaces`, `edgeMarker` (ray against view box), `matchesExample`.
- `inversionText.ts`: `inversionTexts` (state, chip, rows with ids), `lineText`.
- `InversionPanel.tsx`: example and focus selects, radius field, per-focus fields. Attributes: `data-inversion-example|focus|radius via data-inversion-field|source-kind|theta|theta-slider|which|chip|readout=<id>|state`.
- `InversionGraph.tsx`: `PointSetGraph` subclass (pointLimit 1, coordinateLimit 10). Owns the figure (input curves, Q), the handles (radius "r", X, S/S₁/S₂, O, θ, O₁/O₂) and the chip `inversion-chip`. The vertex is renamed C or P after each sync by finding the base point `P1`. Overlays: inversion-circle, rays, image, secant, tangent, angle-tangents.

## Decisions and risks to check

- The base names its vertex `P1`. I rename it by searching for that name (`nameVertex`), because I was not to change `PointSetGraph`. If the host test cannot find C or P, check this first.
- Source kind switch resets to a default (circle (1,0) r 1, or line (-3,-3)-(3,3)); the other kind's values are not remembered.
- Edge-marker redraw uses `epoch` plus the `boundingbox` and `up` session events (`refreshView`). Not exercised.
- Angle focus draws image circles by calling `analyseSource` per circle; tangent directions at Q and Q′ are plain tangent arithmetic, not inversion.
- Radius field and handle are hidden in focus `power`; the inversion circle is not drawn there.
- `power.thetaDeg` must be in [0, 360) in graphState (checked by the collection).
- Unverified: all rendering, drag, dispose counts, language switch, panel text. The panel, graph and view have never run.

## Remaining (from the brief)

1. `inversionPresetCollection.test.ts`: every example round trip, unknown field, non-finite θ, radius 0 and 9, non-integer and out-of-range points, line with equal points, bad example id, bad focus, two vertices, mode and grid step rejections.
2. `InversionGraph.host.test.tsx` (model on `SimsonLineGraph.host.test.tsx`: `installBoardShims`, `Observed` subclass, `settle`, `expectFiniteBoard`): reset; preset restore; object count across focus switches and a source kind switch, and dispose; example numbers (X′ (6/5, 2/5) for point; x = 2; circle (3/2, 0) with r² = 1/4; power 16, PA·PB ≈ 16, tangent length 4; orthogonal self-map; 60° before and −60°/60° after; line through C); X = C message; X at distance 1 with r = 8 gives the edge marker, "outside the view" and no non-finite coordinates; radius and θ controls; deleting the vertex; SL to EN switch.
3. For each test group, report a failure seen under a deliberate mutation.
4. `docs/reviews/triangle-geometry/08-drag-measurement.md` (format of `07-drag-measurement.md`): object counts in each focus with all overlays on, and a timed jsdom drag of C, X, a source centre and the θ handle.
5. Run `just unit src/compgeo/inversion src/graphs/compgeo/Inversion src/graphs/compgeo/inversion src/localization`, `npx tsc --noEmit --pretty false`, `just lint` on the new files, `just build`. Logs go under `C:\Users\NonFriedMotherBoard\.claude\jobs\706240bc\tmp` (`loc.py` there is the locale insert script, already applied; do not rerun it).
6. Check the `lineText` output for the spec line `x = 2` (a=1, b=0, c=2) and the `through-centre` example row text.
