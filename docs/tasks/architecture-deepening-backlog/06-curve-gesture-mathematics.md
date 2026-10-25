# 6. Curve editing gesture mathematics

Status: planned. Lane: Curves; after task 4. Source: [specification §6](../../specs/architecture-deepening-backlog.md#6-curve-editing-gesture-mathematics).

## Scope and entry points

- `src/graphs/curves/object/AbstractJXGPointControlledCurve.ts:171-295, 406-430, 661-690`.
- `src/bezeg/impl/curve/abstract-point-controlled-curve.ts` (moveFor/scale/rotate).
- Degree elevation: `AbstractJXGBezierCurve.ts:20-30` versus `polynomial-bezier-curve.ts:14-25`.
- `graphs/base/CurveEditingFeature.ts`.

## Implementation and acceptance

- Reproduce first, with failing tests:
  - rotation with the pointer vertically aligned with the centre;
  - rotation across ±90°;
  - resize of a degenerate (zero-width or zero-height) box.
- Move gesture transform mathematics (rotation angle, scale factors, pivot) into a tested module in the mathematical layer. The adapter keeps pointer state and handle drawing.
- Give `abstract-point-controlled-curve.ts` direct tests for translate, scale and rotate.
- Keep one degree elevation implementation. Keep the lesson test that compares results (`interpolationExamples.test.ts:332`) or replace it with a direct check.
- Measure representative drag and rotate interactions before and after, as `performance-plan.md` requires.

## Verification

Run the adapter and math tests, typecheck and build. In the browser, try select, drag, resize and rotate on polynomial, rational and spline curves with mouse and touch.
