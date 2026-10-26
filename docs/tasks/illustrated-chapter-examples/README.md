# Illustrated chapter examples: implementation tasks

Status: implementation in progress, authorized 2026-10-26. Source: [Illustrated guided examples within chapter flow](../../specs/illustrated-chapter-examples.md). See the [acceptance record](../../reviews/illustrated-chapter-examples/acceptance.md) for completed checks and outstanding requirements.

| Task | Depends on | Completion scope |
| --- | --- | --- |
| [00 Curriculum and entry audit](00-curriculum-audit.md) | None | Every source example, concept, placement and link disposition |
| [01 Ordered chapter content and example identity](01-ordered-content.md) | 00 | Shared renderer/reference seam, safe entry and return mapping |
| [02 Prepared-scene preview pipeline](02-preview-pipeline.md) | 00, 01 | Capture, required media metadata and validation contract |
| [03 Bézier and foundations](03-bezier-foundations.md) | 00–02 | Two complete bilingual chapters, merged examples and final captures |
| [04 Rational curves and splines](04-rational-splines.md) | 00–02 | Two complete bilingual chapters, merged examples and final captures |
| [05 PH curves and parametrization](05-ph-parametrization.md) | 00–02 | Two complete bilingual chapters, merged examples and final captures |
| [06 Functions, calculus and analysis](06-functions-analysis.md) | 00–02 | Two complete bilingual chapters, merged examples and final captures |
| [07 Integrated review and acceptance](07-acceptance.md) | 03–06 | Exhaustive reconciliation, review, checks and browser evidence |

Task 00 is complete; tasks 01–03 are in progress. Final captures, chapter migrations and integrated acceptance remain outstanding. Read the source spec and assigned task before implementing. The handler owns dispatch, review, integration, checks and Git; implementation workers do not delegate or commit. Follow [agent workflow](../../agent-workflow.md) for bounded assignments and evidence. Return at most 400 words summarizing changed paths, acceptance covered, check results, unresolved risks and the durable evidence path; keep bulky matrices and capture output in files.

Tasks 03–06 are content slices, not unrestricted concurrent write permission. `familyChapters.ts`, the example registry, capture manifests and shared tests have one writer at a time. Prefer serial batches; parallel work requires handler-assigned disjoint files or explicit section handoffs with handler integration. The preview/build server has a named owner and stable revision; coordinate capture and smoke ports. Split a batch at a chapter boundary if it exceeds a bounded worker assignment.

Each batch updates the audit mapping and evidence for its chapters, with final captures after its scene/content changes. The final handler reconciles the complete matrix rather than treating batch checks as whole-product acceptance. Application implementation, image capture and browser verification are future work; creating this queue does not claim those checks passed.
