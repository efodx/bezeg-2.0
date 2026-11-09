# Wave 2 slice K3: interpolation family, comb, envelope, offset and parametrisations

Read `w2-fc-common-brief.md` first; it holds role, scope limits, shared files, test rules, checks and return format. Read `w2-k1.md` (slice K1's evidence) for any `CountSetter` addition.

**Owned:** `src/graphs/curves/interpolation/**`, `hermite/**`, `subdivisionCurves/**`, `comb/**`, `envelope/**`, `offset/**`, `parametrisations/**`, and their tests. Nobody else edits these this round. Do not edit `src/inputs/**` or `src/graphs/base/**`.

**Work (inventory rows 94, 95, 97, 103–105, 109–111):**
- **Notices (C22).** Interpolation's, Hermite's and SubdivisionCurve's state-enum notices (`role="alert"`) go through one `RefusalChannel` per graph and the shared `guard` (`src/graphs/base/controls/guard.ts`; precedent `BaseFunctionGraph.refusals`, decision 17), shown alone and cleared on the next accepted edit. Mathematical refusals (Interpolation's repeated parameter) keep their stated reason (decision 7).
- **Readouts (C21).** Interpolation's `role="status"` readout and SubdivisionCurve's status group (`aria-live`) become the graph's one `LiveReadout` (`useStatusReadout` or `StatusLive` in `src/graphs/base/controls/`, `settled` where a drag changes the text), muted while SubdivisionCurve plays. A visible block keeps its text without a live role (decision 18). Check Comb, Envelope and Offset, which already use `LiveReadout` (C21 in the inventory), have exactly one region.
- **Playback Reset (C9, task 0 decision 1).** SubdivisionCurve's "Reset polygon" is the playback Reset of its `PlaybackButtons`, with a distinct label; check it is already, or move it there.
- **Counts as sliders (C5 candidates).** Handler rule for this slice: a count whose range has at most 20 values is a `CountSetter` with `onSet`; a longer sample or line count stays a `Slider` with its exact field (C13), because stepping one by one through it is unusable. Apply it to Comb's count, Envelope's line count, Offset's samples, AlphaParam's and SplineAlpha's sample counts and UniformParam's count; list each with its range and result.
- **Unavailable controls (C6).** Any native `disabled` in your panels gets its reason (`UnavailableButton`, `unavailableReason`).
- **Point lists (C4).** Interpolation, Hermite and SubdivisionCurve already use `PointListInput`/`PointCollection`; leave them unless a check above needs a change. For SplineAlpha and AlphaParam (draggable points, no typed path, typed paths table rows 189–190) give the boards a typed path through the curve workspace list or `PointListInput`, following K1's findings; stop and report if a model change is needed.

**Lessons:** interpolation, Hermite, subdivision, comb, envelope, offset and parametrisation lessons exist; run their lesson unit tests.

**Evidence file:** `w2-k3.md`. **Handoff note:** `w2-k3-handoff.md`.
