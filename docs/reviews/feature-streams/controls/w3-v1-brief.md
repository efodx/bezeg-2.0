# Wave 3 slice V1 brief: Reset example, ComplexRoots degree, Pascal targets, choice reasons, point nouns

Read `w3-common-brief.md` first (it reuses `w2-pa-common-brief.md` by section). Slice id: `v1`. Decisions 10, 33, 34 and 62 (search `^62\.`, `^33\.`, `^34\.`), *Likely exceptions* rows "Reset example …" and "LinearMap Reset to the identity".

## Rows (from `w3-triage.md`)

C9-01, C9-02, C9-03, C26-01, OI-02, OI-03, OI-04.

## Owned paths

- Shared controls (owner this wave): `src/inputs/ChoiceSelect.tsx`, `src/inputs/PointCollection.tsx` and their tests and CSS; a new shared Reset-example button under `src/inputs/` (your naming).
- `src/graphs/compgeo/VoronoiControls.tsx` (not `VoronoiGraph.tsx` beyond what the button needs; its import line belongs to P2b, so do not touch imports of `tracePlayback`), `src/graphs/curves/bspline/` Extraction, Insertion and Nurbs graphs, `src/graphs/linear/LinearMapGraph.tsx`, `src/graphs/complex/ComplexRootsGraph.tsx`, `src/graphs/projective/PascalControls.tsx` and projective CSS, tests beside them; `sl.ts`/`en.ts` shared.

Two other workers run at the same time: P2a (Euler, Epicycle, collision) and P2b (trace policy, IterativeFunctionGraph, De Boor, SubdivisionCurve, the `tracePlayback` import line in compgeo files). Do not touch their files.

## Work

1. **Reset example** (decision 62): one shared button, one key (merge `bsp_example_reset` and `vor_example_reset` into one; delete the old keys), placed beside the example `ChoiceSelect` and out of the `inspector-playback` groups; unavailable with a reason while the scene equals the chosen example (find how each graph knows that; decision 38's "custom" entry logic is the precedent). Linear map's identity reset: `UnavailableButton` with a reason at the identity.
2. **ComplexRoots degree** (decision 10): `NumberInput` becomes `CountSetter` with the same range and model field; Presets keep working.
3. **Pascal steppers** (OI-02): the ◀ ▶ step buttons and `pointset-row` buttons get the 44 px coarse-pointer rule the shared controls use (copy the media query idiom from `src/inputs/NumberInput.css`).
4. **`ChoiceSelect` unavailable reason** (decision 34): implement what decision 34 states (read it); show it on at least the caller decision 34 names, with a test.
5. **`PointCollection` item noun** (decision 33): implement what decision 33 states; pass the noun from the callers it names, with a test.

If decision 33 or 34 turns out already implemented or no longer applicable, record that with evidence and skip it.

## Checks

Common checks plus the tests of every touched graph and input, the B-spline and Voronoi lesson tests, `src/graphs/base/sharedControls.graphs.test.tsx` (read-only; it must stay green), and one Preset restore for ComplexRoots.
