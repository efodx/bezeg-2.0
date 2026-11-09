# Wave 2 slice S: Slider additions for compgeo and projective

Read `w2-common-brief.md` first. Then `w2-c1.md` (C1 evidence) and `w2-p-handoff.md` (the projective worker's note) for context only.

**Owned:** `src/inputs/Slider.tsx`, `Slider.css`, `Slider.test.tsx`, and `NumberInput.tsx`/`NumberInput.test.tsx` only where the Slider's exact field needs it; `src/graphs/compgeo/SimsonLinePanel.tsx`, `InscribedAnglePanel.tsx`, `InversionPanel.tsx` and their host tests; `src/graphs/projective/ThreeViewsControls.tsx` and `ThreeViewsGraph.host.test.tsx`. Another worker (P2) owns the rest of `src/graphs/projective/`; others own the rest of compgeo. Keep existing `Slider` callers unchanged in behaviour (search all callers; props are optional with today's default).

**Handler decisions (record nothing in the spec; the handler does):**
1. **`cyclic`** (spec *Likely exceptions*, "Cyclic angle fields"): an optional period on `Slider` whose exact field and arrow keys wrap the value instead of refusing; decision 3's refusal does not apply. Wire it into Simson, InscribedAngle and Inversion so typed 370 gives 10 and ArrowDown at 0 gives 359 (as before the sweep).
2. **Typed precision independent of slider step:** an optional override so the exact field accepts fractional degrees while the slider step stays integer. Wire it where the pre-sweep field accepted fractions (check the C1 panels' pre-sweep code with `git show HEAD:<path>`).
3. **`unavailableReason`** on `Slider`, matching `NumberInput`'s: no native `disabled`, the reason is shown and described (I2/C6). Use it for the ThreeViews angle slider when the point is off.
4. **Grid snap with notice** for typed values (decision 8): an optional grid on `Slider` whose exact field snaps an off-grid value and states it, as `NumberInput`/`PointListInput` already do. Use it for ThreeViews (c in tenths, angle).
5. **Value text:** if `Slider` has no way to keep a unit in `aria-valuetext` without losing the exact field, add an optional unit or value-text formatter for the slider thumb only; restore "°" and "c =" in ThreeViews and the angle sliders.
6. **InscribedAngle typed value in an exclusion gap:** restore the pre-sweep rule (typed values go to the nearer edge; drags keep moving in the drag direction) if `Slider` can tell typed from dragged changes with a small optional argument; otherwise report and leave it.

**Checks:** `Slider.test.tsx` cases for each new prop with an observed failure before the prop exists (write the test first); existing `Slider`, `NumberInput`, `sharedControls.behaviour.test.tsx` and `sharedControls.graphs.test.tsx` pass; the C1 panels' and ThreeViews host tests pass; one real-graph case each for the cyclic wrap (Simson or Inversion) and the ThreeViews snap; `just lint` and `just typecheck` on your files. Report the test-time delta.

**Evidence file:** `w2-s.md`. **Handoff note:** `w2-s-handoff.md`.
