# 08 Batch D: power of a point and inversion (F2a–F6, `G-REG`)

Spec: T5; batch-wide gate. Kernels: task 03 (`powerOfPoint`, intersections, `invertExact`) and [complex maps task 01](../complex-maps/01-mobius-kernel.md) (`circleInversion` and generalized-circle images) for every drawn image. **Hard dependency:** complex maps task 01 on `master`; without it this batch does not ship.

- **Kernel check first:** the test comparing `invertExact` with complex maps' `circleInversion` to \(10^{-12}\) (task 03 acceptance 6), if it is not already present.
- **F2a:** inversion centre and radius on the grid, a point \(X\) and its image \(X'\), a generalized-circle gallery drawn through the complex maps kernel, secant and tangent for the power, signed and unsigned angle readouts, the centre-point message, and clipping with a marker instead of non-finite coordinates.
- **F2b–F4:** route `/inversion`, lesson T5 (orientation reversal stated; complex maps lesson 1 linked as a prerequisite), chapter entry.
- **F5–F6:** media; Batch D gate, smoke including the centre point, earlier lessons unchanged.
