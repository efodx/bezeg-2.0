# 09 Batch C: composition and affine maps (F2a–F6, `G-REG`)

Spec: L5. Decisions: ADR 0025 §2 (rotation as a snapped \(15^\circ\) angle).

Status: F2a slice 1 (model and kernel) and slice 2 (composition mode, controls, readouts, Presets, tests) done 2026-11-13 (handler 18); F3 actions, L5 content and chapter join, F5 card (handler 19); F6 gate: `just check` on `181e0a61`, Presentation mode sl/en, smoke incl. `/bezier/affine` unchanged; hosted CI pending the push.

- **F2a composition mode:** two matrices \(A\), \(B\) (handles or a chosen element: rotation by snapped angle, reflection, scale, shear), the combined image and product readout \(BA\), an optional translation vector and pivot form \(T(P)=c+A(P-c)\), and the Bézier fixture. Orientation for rotations comes from the snapped angle.
- **F3–F4:** L5 with a link to the existing affine lesson; the prose names the existing buttons' pivots (control-point mean for rotation and reflection, bounding-box centre for scale).
- **F5–F6:** media, Batch C gate, `just check`, smoke including `/bezier/affine` unchanged, hosted CI.

Acceptance: L5 acceptance 1–7; the existing `affine` Demonstration, lesson and Presets unchanged.
