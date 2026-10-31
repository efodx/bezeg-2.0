# 05 Batch A graphs: K1–K3 (F2a)

Gate: none, because projective graphs add no function model and no curve object. Depends on 01–03. Decisions: [ADR 0033](../../adr/0033-projective-conics-exact-kernel-and-family.md) §2–4.

- Graph classes under `src/graphs/projective/` for the cross-ratio (K1), Pascal and Pappus (K2) and the pole and polar (K3). Each provides its contract's graph needs, explicit board and listener ownership, and keyboard parameter stepping.
- A new family Preset collection module (ADR 0016). Presets store the example id, grid points and table indices. They are validated on import, with an actionable error.
- Unit and component tests. No route yet.
- Measure dragging per the [performance plan](../../performance-plan.md), then fix the pencil table size and the sample density. Record the numbers in ADR 0033 or in a follow-up ADR.
- Engineering and UI/accessibility review.
