# Lesson example improvements: tasks

**Source spec:** [Lesson example improvements](../../specs/lesson-example-improvements.md)

**Status:** planned 2026-10-20. Tasks 00–08 implemented and unit-verified 2026-10-25; no browser acceptance yet. Task 09 not started. Handoff: [handoff-2026-10-25](../../reviews/lesson-example-improvements/handoff-2026-10-25.md).

These tasks cover all 45 available lessons from the source review. Read the source spec's shared acceptance and verification requirements, then the assigned task. Exact scene geometry and visual acceptance remain implementation work where only a candidate is specified.

## Batches and dependencies

| Batch | Task | Depends on | Status |
| --- | --- | --- | --- |
| A | [00 Lesson scene preparation](00-lesson-scene-preparation.md) | None | Implemented; acceptance pending |
| A | [01 Bézier, interpolation, affine, elevation](01-bezier-and-interpolation.md) | 00 | Implemented; acceptance pending |
| A | [02 PH examples](02-ph-examples.md) | 00 | Implemented; acceptance pending |
| B | [03 Rational constructions](03-rational-constructions.md) | 00; coordinate with 01 | Implemented; acceptance pending |
| B | [04 Spline constructions](04-spline-constructions.md) | 00 | Implemented; acceptance pending |
| C | [05 Parameterization](05-parameterization.md) | 00, 04; coordinate with 02 | Implemented; acceptance pending |
| C | [06 Function example sequences](06-function-example-sequences.md) | None | Implemented; acceptance pending |
| C | [07 Convergence examples](07-convergence-examples.md) | None | Implemented; acceptance pending |
| D | [08 Retained-example regression review](08-retained-examples.md) | 00–07 | Implemented; acceptance pending |
| D | [09 Integration and acceptance](09-integration-and-acceptance.md) | 00–08 | Planned |

Batch labels express priority, not a requirement to implement every earlier batch before starting independent work. Task 00 first establishes the shared preparation boundary; it may close with evidence that existing capabilities suffice. Do not build infrastructure merely because a task exists.

## Lesson coverage and ownership

| Task | Lesson IDs | Disposition |
| --- | --- | --- |
| 01 | `bezier`, `decasteljau`, `decasteljau-alternative`, `affine`, `elevation` | Simplify introductions/comparisons; retain effective elevation geometry |
| 02 | `ph-cubic`, `ph-quintic` | Simpler generator arithmetic |
| 03 | `rational`, `rational-decasteljau`, `rational-elevation`, `rational-subdivision`, `rational-extrapolation`, `farin`, `circle` | Improve baselines and advanced comparison; retain Farin/circle examples |
| 04 | `spline-cn`, `spline-c1`, `spline-c2`, `spline-g1`, `spline-g1-symmetric` | Fewer pieces, compact constructions, one-joint introduction |
| 05 | `weighted-parameterization`, `uniform-parameterization`, `spline-parameterization` | Clearer sampling comparisons |
| 06 | `trigonometric-functions`, `area-between-curves`, `taylor` | Improve ordering and isolate changes |
| 07 | `sequence`, `uniform-convergence` | Clear initial successful examples and later contrasts |
| 08 | `linear-function`, `exponential-function`, `continuity`, `derivative`, `definite-integral`, `arc-length`, `bisection`, `mean-value`, `accumulation`, `darboux`, `extrema`, `convexity`, `fixed-point`, `complex-multiplication`, `subdivision`, `repeated-subdivision`, `extrapolation`, `bernstein` | Retain and verify specific teaching behaviors |

## Execution and evidence

- Delegate bounded implementation slices under [the agent workflow](../../agent-workflow.md); the handler owns scope, review, verification, and commits. Workers do not delegate further.
- One owner edits shared `src/learning/model.ts`, the content action contract, runtime adapters/registries, localization catalogs, chapter activities, and smoke integration. Separate files do not make concurrent shared-contract changes independent. Serialize tasks touching the same lesson content module (notably 01/03 and 06/07).
- Prefer lesson-only changes. Record any changed demonstration default, Reset behavior, catalog preview, or chapter example in the owning task's evidence.
- Each implementation task records status, changed scenes, exact numerical checks, commands/results, reviewer findings and disposition, browser coverage, and explicit gaps. Link bulky evidence under `docs/reviews/lesson-example-improvements/` when generated; do not create placeholder acceptance evidence.
- Task 08 checks the 18 retained lessons; it does not mandate rewriting them. Task 09 closes cross-task findings and checks the complete 45-ID coverage against the current availability list.
- Documentation-only planning does not require application tests or smoke. Future implementation uses the source spec's checks and the repository Git rules. Do not mark a task accepted merely because its code is written.
