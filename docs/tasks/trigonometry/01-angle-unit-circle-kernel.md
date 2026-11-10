# 01 Angle and unit-circle kernel (F1, Batch 0)

Spec: [trigonometry kernel](../../specs/trigonometry-lessons.md#trigonometry-kernel-owned-by-this-spec) items 1, 2; TR1 acceptance 1–4; TR2 acceptance 1–2; Testing Decisions; Correctness Notes. Decisions: ADR 0044 §3.

Scope: new `src/trig/angle.ts`, `src/trig/unitCircle.ts` and their test files. No React, JSXGraph or localization. Edit no existing file.

Acceptance:

1. `Angle = {halfDegrees}`, an integer wrapped to \([0,720)\). Constructors reject non-integers and non-finite values. `fromDegrees` and `fromPiMultiple` snap to the nearest half-degree. `toRadians` is \(\pi h/360\).
2. `quadrant` (I–IV) and `onAxis` (which axis) are integer tests on all 720 states. A state on an axis has no quadrant.
3. `specialValue` returns exact text, such as `\\frac{\\sqrt{3}}{2}`, from a closed table for multiples of \(30^\circ\) and \(45^\circ\), and `undefined` otherwise. The test checks every table entry against `Math.sin`/`Math.cos` to \(10^{-15}\).
4. `pointOnCircle`, `arcLength(angle, r)`, `rotationFrame(a)` and the symmetric images (`720-h`, `h+360`, `360-h`) are produced by integer operations on \(h\).
5. TR1 and TR2 default numbers match the spec. \(\sin^2+\cos^2=1\) holds to \(10^{-15}\) at all 720 states. The addition formulas match direct evaluation to \(10^{-15}\) over a sample of half-degree pairs. The direct evaluation is written independently in the test.

Checks: `just unit src/trig`. Report an observed failure of each new assertion group against a deliberate mutation.
