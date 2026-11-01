# BS-A-2a2: B-spline basis-plot graph and knot editor (evidence)

What: `BSplineBasisGraph` (BaseGraph subclass, scene state degree/knots/normalized/t, owned `BSplineBasisScene`), `KnotEditor` (typed NumberInput per knot, arrow step 0.01, kernel-validated refusals), model `bsplineBasisModel.ts`, shared refusal text `bsplineKnotMessages.ts`. Not registered (no route, factory or lesson). Preset data is the local B-spline collection DTO with placeholder points. Worker (Sonnet medium, handoff-v12) returned partial at its budget; the handler finished the items below.

Checks (observed, handler, 2026-11-02): `just unit src/graphs/curves/bspline src/bezeg/impl/curve src/presets` 358 passed before the review repairs; `just unit src/graphs/curves/bspline` 47 passed after them; `just lint` on the slice and both locale files passed; `just build` passed.

Mutations: worker 7 of 8 killed; the survivor (setDegree ignoring an unclamped vector) is now covered by a test that failed under that mutation. Handler mutations, each caught: sampler without knot samples (3 tests failed), no `figurePresetGraphState` override, no stale-refusal reset.

Review repairs (engineering + UI Sonnet, mathematics Sonnet):
- Medium: a figure scene replaced the state with mount defaults after importing the data, so a Preset without `graphState` drew the default vector. `figurePresetGraphState` now keeps the imported degree and knots; the test goes through the state replacement with and without a stored state.
- Low: the refusal hint stayed in the old language and after outside vector changes. `KnotEditor` drops it (and the refused draft) on a language switch or outside change; the group is labelled by its heading.
- Low (mathematics): the fixed 400-step grid drew a slanted segment at a knot of multiplicity k + 1 and missed knots between grid points. `sampleBasis` now adds every distinct interior knot and a left-limit sample before it.

Measurement (jsdom, real board, worker): knot drag 3.88 ms/event, t sweep 10.48 ms/step (with React re-render). Samples are computed once per knot array and shared by all curves; a slider move reuses them. Browser measurement belongs to registration.

Deferred lows: the `role="status"` readout announces on every slider step; `as never`/`as unknown as` casts in `BSplineBasisScene.create`; an invalid marker drag snaps back without a hint; a typed knot beyond ±100 reports the not-finite message; the typed list stays raw and markers are locked in the [0, 1] display mode.
