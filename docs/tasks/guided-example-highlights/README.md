# Guided example highlights: implementation tasks

Status: done 2026-11-02, feature accepted ([acceptance record](../../reviews/guided-example-highlights/acceptance.md)); planned 2026-10-26; audit 00 done and its owner decisions recorded in the spec on 2026-10-31. Source: [Guided example highlights replace chapter figures](../../specs/guided-example-highlights.md).

| Task | Depends on | Completion scope |
| --- | --- | --- |
| [00 Highlight and figure audit](00-highlight-audit.md) | None | Highlight choice for all 67 examples; disposition of all 29 figures (done) |
| [01 Highlight capture pipeline](01-highlight-capture.md) | 00 (sample entries) | Recipe format, runner, manifest, validation |
| [02 Larger card layout](02-card-layout.md) | None | Card composition, before/after evidence |
| [03 Bézier, foundations, rational, splines](03-batch-a.md) | 00, 01 | Figures removed, prose/captions rewritten, highlights captured |
| [04 PH, parametrization, functions, analysis](04-batch-b.md) | 00, 01 | Same for the other four chapters |
| [06 Bézier patches](06-batch-patches.md) | 00, 01 | Same for the patches chapter (own files) |
| [05 Figure kind removal and acceptance](05-acceptance.md) | 02–04, 06 | Delete figure content kind; integrated review and browser evidence |

Tasks 01 and 02 can run in parallel after 00. Batches 03 and 04 both edit `src/learning/content/familyChapters.ts` and the capture manifest: the handler either serializes them or assigns each batch exclusive chapter ranges and integrates shared files itself. Batch 06 edits only the patches chapter files and its example registry, so it can run beside 03 or 04. Recapture with the final build after the batches land if presentation fingerprints change.
