# 06 Batch B: S3 and S4 Demonstrations (F2a–F6)

Gates: `G-FN`, `G-REG`. Depends on 03 and on Batch A being released.

- **F2a:** a polynomial-zeros graph (draggable zeros with numeric and keyboard alternatives, merge announced in text, degree cap with a visible reason) and a rational-function graph (holes as open circles, dashed asymptotes with text labels, the remainder readout). Drawing uses the piece sampler, and no segment crosses a pole. Before tuning, measure dragging of the adaptive plot per the performance plan.
  - *F2a-1 accepted 2026-11-03:* `PolynomialZerosGraph` with `zeroListModel.ts`, `ZeroListEditor.tsx` and `zeroListMessages.ts` shared with S4; grid 0.1 (`snapZero`, so equal positions are `===`); examples `default` \((x+2)(x-1)^2\), `triple` \((x-1)^3\), `degree-five` \(0.2(x+3)(x+1)^2(x-2)^2\); Preset collection `polynomial-zeros` (route pending, F2b). Scoped units green, five mutations caught. Briefs `school-06-f2a-poly.md` and `-resume.md` (the first worker handed off at 135k).
- **F2b:** routes and registration. **F3:** lessons S3 and S4. **F4:** add them to the chapter. **F5:** media.
- **F6:** the Batch B gate: plotting across poles verified, `just check`, smoke in both languages, and CI.
