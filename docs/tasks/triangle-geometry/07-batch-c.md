# 07 Batch C: Simson line (F2a–F6, `G-REG`)

Spec: T4; batch-wide gate. Kernel: task 03 (`feet`, `pedalOrient`, `SIMSON_GLIDER_TOLERANCE`). Decisions: ADR 0030 §2.

**Release condition:** accepted by the owner 2026-11-02: exact mode for a grid \(P'\); glider mode at \(\varepsilon=0\) reads plain "collinear" with area \(0\) (the \(10^{-9}\,S\) guard stays internal; spec T4 acceptance 2); the discrete offset slider. F6 is not blocked on the owner.
- **F2a repair (owner decision):** glider status at \(\varepsilon=0\) "collinear" / "kolinearna" and area readout \(0\); the host test expects the plain status instead of forbidding it.

- **F2a:** the T1 triangle with its circumcircle, glider \(P\) and free grid \(P'\), feet on the side lines, the line through distinct feet, a pedal-area readout, status text, and the offset slider \(\varepsilon\in\{0,\pm0.001,\pm0.01,\pm0.05,\pm0.2\}\).
- **F2b–F4:** route `/simson-line`, lesson T4 stating that the drag shows only the "if", chapter entry.
- **F5–F6:** media; Batch C gate, smoke including the offset slider, earlier lessons unchanged.
