# 09 Batch D: de Moivre and Euler's formula (F2a–F6, gated)

Gates:

- F2a waits for Controls step 5 `accepted` in [controls.md](../feature-streams/controls.md).
- F2b–F6 wait for Controls step 7.
- The release waits for Batch A (task 04).

Status (F2a): `ComplexPowerGraph` done (model, graph, Preset collection and tests; not registered, unsmoked); `EulerCircleGraph` done at F2a (model, graph, Preset collection and tests; not registered, unsmoked); F2b–F6 open.

Spec: M6, M7 and the [Batch D amendment](../../specs/complex-maps-lessons.md#batch-d-gating-kernel-gaps-f1-terms-and-tests-families-prep-amendment-2026-11-10). Decisions: [ADR 0058](../../adr/0058-complex-maps-batch-d-power-and-euler-graphs.md).

The F2a work adds new `ComplexPowerGraph` and `EulerCircleGraph` files, with step and play controls from step 5. The scene tests set \(z\), set \(n\) and step in one synchronous tick. When the gate opens, split this task, following the scene and registration model current at that time.

Terms (F0 decision), entering the [localization table](../../localization.md#choosing-new-terms) when first shipped:

| English | Slovenian | Basis |
| --- | --- | --- |
| de Moivre's formula | Moivreova formula | Settles the spec's open choice. The Slovenian possessive keeps the written stem of a name ending in a silent *e* (as in *Laplaceov*) |
| Euler's formula | Eulerjeva formula | Standard |
| uniform circular motion | enakomerno kroženje | As in [kinematics](../kinematics/README.md#slovenian-terms-f0-decision) |
| velocity; acceleration | hitrost; pospešek | As in kinematics |
| partial sum | delna vsota | Standard |
