# Guided example highlights: implementation tasks

Status: planned 2026-10-26; not started. Source: [Guided example highlights replace chapter figures](../../specs/guided-example-highlights.md).

| Task | Depends on | Completion scope |
| --- | --- | --- |
| [00 Highlight and figure audit](00-highlight-audit.md) | None | Highlight choice for all 56 examples; disposition of all 16 figures |
| [01 Highlight capture pipeline](01-highlight-capture.md) | 00 (sample entries) | Recipe format, runner, manifest, validation |
| [02 Larger card layout](02-card-layout.md) | None | Card composition, before/after evidence |
| [03 Bézier, foundations, rational, splines](03-batch-a.md) | 00, 01 | Figures removed, prose/captions rewritten, highlights captured |
| [04 PH, parametrization, functions, analysis](04-batch-b.md) | 00, 01 | Same for the other four chapters |
| [05 Figure kind removal and acceptance](05-acceptance.md) | 02–04 | Delete figure content kind; integrated review and browser evidence |

Tasks 01 and 02 can run in parallel after 00. Batches 03 and 04 both edit `src/learning/content/familyChapters.ts` and the capture manifest: the handler either serializes them or assigns each batch exclusive chapter ranges and integrates shared files itself. Recapture with the final build after both batches land if presentation fingerprints change.
