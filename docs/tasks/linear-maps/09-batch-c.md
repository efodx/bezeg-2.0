# 09 Batch C: composition and affine maps (F2a–F6, `G-REG`)

Spec: L5. Decisions: ADR 0025 §2 (rotation as a snapped \(15^\circ\) angle).

- **F2a composition mode:** two matrices \(A\), \(B\) (handles or a chosen element: rotation by snapped angle, reflection, scale, shear), the combined image and product readout \(BA\), an optional translation vector and pivot form \(T(P)=c+A(P-c)\), and the Bézier fixture. Orientation for rotations comes from the snapped angle.
- **F3–F4:** L5 with a link to the existing affine lesson; the prose names the existing buttons' pivots (control-point mean for rotation and reflection, bounding-box centre for scale).
- **F5–F6:** media, Batch C gate, `just check`, smoke including `/bezier/affine` unchanged, hosted CI.

Acceptance: L5 acceptance 1–7; the existing `affine` Demonstration, lesson and Presets unchanged.
