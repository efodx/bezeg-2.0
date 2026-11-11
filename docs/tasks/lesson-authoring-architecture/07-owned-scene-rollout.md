# 07. Roll out ownership of standalone scenes

Status: planned, 2026-11-11. Source: [rollout scope and O1–O3](../../specs/lesson-authoring-rollout.md#owned-scenes); extends completed [task 04](04-owned-standalone-scenes.md).

## Scope and entry

Disposition these baseline candidates, found with local scene/ensureScene/removeScene ownership:

- `BSplineBasisGraph`, `DeBoorGraph`, `BSplineInsertionGraph`, `BSplineExtractionGraph`.
- `InterpolationGraph`, `HermiteGraph`, `SubdivisionCurveGraph`, `ParametricCurveGraph`.
- `InscribedAngleGraph`, `SimsonLineGraph`, `InversionGraph`.

`SceneDeclaration` and `SceneSlot` are in `src/graphs/base/OwnedScene.ts`; `BSplineBlossomGraph` and `BSplineNurbsGraph` are the migrated references. The eight curve candidates extend `BaseGraph` and hold one optional scene object. The three plane-geometry candidates extend `PointSetGraph` and track lists of board objects instead; task 08 covers the same three graphs.

Inspect each graph's scene and inheritance before selecting it. The slot fits one graph-owned standalone scene; a similarly named mathematical cache alone is not an owned drawing scene. Existing curve-object ownership, auxiliary boards and surface views remain with their appropriate owners. New Families-prep scenes are outside this baseline task.

## Steps

1. Map creation inputs, model synchronization, board/listener resources and replacement/figure/lesson hooks for every candidate. Mark already shared or incompatible cases with their exact reason. Finish with a finite list of eligible graphs and the tests that currently protect them.
2. Characterize the distinctions missing from existing contracts: same-shape changed knots/mode, synchronous scenes, old listener identities, construction failure and late work. Reuse existing tests; agree ownership before Controls visual consolidates the same lifecycle files.
3. Migrate eligible graphs in bounded batches through `SceneDeclaration` and the existing `BaseGraph` slot. Start with the B-spline graphs whose files are unclaimed. Delete replaced ownership hooks while retaining domain scene creation/synchronization and existing rebuild decisions. Verify each batch before taking the next.
4. Account for all eleven candidates, compare the remaining lifecycle code with the initial inventory, and update architecture guidance. An exclusion needs a demonstrated contract mismatch, not a missing test or time limit.

## Coordination, verification and completion

Serialize host-hook changes with task 08, and take `InscribedAngleGraph`, `SimsonLineGraph` and `InversionGraph` only while task 08 is not editing them or `PointSetGraph`; task 06 may prepare registration metadata independently but must not edit the same graph imports concurrently. Controls visual's disposal-test consolidation is a shared-file dependency only for the affected batch.

Meet O1–O3 through real-host lifecycle, lesson/checkpoint/figure restoration and construction-failure checks, plus relevant mathematical observations. Use focused route smoke for consumer-only changes and the full shared checklist when host/lesson-runtime behavior changes. Record exact object/listener assertions retained through any test consolidation and the final disposition of every candidate.
