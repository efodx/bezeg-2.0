# Planning record cleanup — 2026-10-24

Source: [bounded cleanup spec](../specs/planning-record-cleanup.md) and [retention policy](../specs/documentation-lifecycle.md). The owner requested the retention audit, then explicitly authorized consolidating its findings and removing redundant records. Starting revision: `5b680b4`, with a clean tracked working tree. This is documentation cleanup, not a new application acceptance run.

## Removed and consolidated

| Original records | Removed | Durable home |
| --- | ---: | --- |
| Completed implementation task files | 60 | Current parent specs and the [lesson](lesson-implementation-history.md) and [engineering](engineering-implementation-history.md) histories |
| Superseded interface/prototype specs and one-off fix specs | 13 | [Interface history](interface-implementation-history.md), current feature specs and UI/architecture guidance |
| Obsolete prototype notes, generators and comparison assets | 23 | Selected choices and source commits in the interface history; seven selected carousel/library reference files remain |
| Duplicate delegation research and local migration note | 2 | [Consolidated research](../agent-workflow/external-evidence-2026-10-15.md#consolidated-source-notes) and [migration provenance](separate-project-site.md#historical-local-checkout-transition) |
| **Total** | **98** | Unique decisions, behavior constraints and useful evidence retained |

The audit inventoried all 372 originally tracked documentation files, reviewing every one of the 76 task records and 69 Markdown specs. Reference/ownership checks covered the other guides, research, reviews and assets. All 144 non-Markdown documentation files were checked for exact hash duplication; none were identical. Missing literal image references alone were not treated as deletion evidence: some captures are referred to as sets or through brace-expanded filenames. No pixel-by-pixel redundancy or new visual acceptance claim follows from that inventory.

The cleanup adds three consolidated histories, this review and its bounded spec: documentation falls from 372 to 279 files, a net reduction of 93. The three intermediate retention audits were working notes and were consolidated rather than added as more permanent indexes. Git retains the original detailed handoffs and comparisons at the starting revision.

## Preserved work and evidence

Sixteen task files remain: the eleven lesson-example plan/index files; the mobile playback task; the capability matrix; the controls inventory; and the representative-preview capture/release results. The [capability matrix](../tasks/guided-lessons-rollout/build-capability-matrix.md) is now the sole rollout follow-up owner for the eight missing lesson smoke rows: `bezier`, `decasteljau`, `affine`, `elevation`, `rational`, `rational-decasteljau`, `ph-cubic`, and `ph-quintic`. The redundant pilot-review task was retired after that ownership transfer. Planned work was not silently marked complete.

All ADRs, bilingual chapter source content, mathematical source maps, performance measurements, meaningful release reviews, current graph-style evidence and selected current design references remain. The proposed rendered-graph contracts and publication tooling remain proposals, without new implementation authorization. The PH arc-length/elevation and idempotent-fit specs were retained because source presence alone did not establish all their acceptance criteria.

Useful retained details include same-tick De Casteljau rollback/drawing recovery, target-graph scene limits, original React commit provenance, function view/state/object-count behavior, cohort mathematical repairs, historical Analysis layout observations and batch rerun limits, export/count-control evidence, and the original visual-refinement environment blockers. Actual phone performance limitations and the shared-workspace enlarged-text verification gap remain explicit. Historical observations are not assumed to reproduce today.

## Release-policy reconciliation

Commit `d08cad5` removed standing owner language/terminology approval and physical-device/projector/classroom review gates. Existing available lessons and the chapter pilot are released under that policy. Current guides and status reconciliation no longer reopen completed work solely for those sign-offs. Historical records retain the fact that particular observations were not performed; concrete source, accessibility and smoke-coverage gaps remain named follow-ups.

## Verification

The handler reviewed the consolidated histories against the removed records and their durable sources, then redirected local links, image references and literal paths throughout the retained Markdown. Obsolete image embeds now link to design provenance where no equivalent retained image exists. The reference check compares the original tracked Markdown with the cleaned tree, including local Markdown anchors, and searches retained text sources for all 98 removed paths. Scope and whitespace checks cover the final staged diff.

Final local checks: 164 retained Markdown documents, zero unresolved local file/anchor links, zero literal references to the 98 deleted paths, and deletion-map agreement with Git's complete deletion list. Seven pre-existing local-link failures no longer remain after retirement and correction; surviving stale links were repaired or replaced with explicit archived/local-only provenance. App-root URLs in source chapter drafts were excluded from filesystem-link checks. The inventory and preview capture/release records retain their original content. Independent review caught a missing accumulated-integral single-board/scale decision; the analysis spec and lesson history now preserve that choice, per-function view bounds, reveal-state behavior and original initialization/coverage evidence.

No application source, route, Preset format, runtime asset or dependency changed. TypeScript, builds, unit tests and browser smoke were not rerun for this documentation-only cleanup. Nonportable historical logs remain identified as such rather than linked as repository files; their absence is not a new product failure or new acceptance evidence.

## Rebase reconciliation

The owner explicitly authorized resolving the paused rebase and pushing. The newer master changed skill pointers in two retired records and the evaluation log; the consolidated records remain, and the log uses the new `.agents/skills/` locations. The two retired files remain deleted because their upstream changes only updated obsolete skill links.

The newer evaluation harness intentionally names two retired paths in replay fixtures. Its count-control spec is exported from the pinned solution commit; its fixed-point task exists in the pinned base commit. Both Git objects were checked, so these references remain valid historical inputs and were preserved. They are excluded from the deleted-current-path scan, not silently rewritten to different tasks.

Post-rebase checks covered 167 Markdown files with zero unresolved local file/anchor links and zero unintended references to deleted paths. All ten focused evaluation-harness and project-skill tests passed. The first sandboxed run could not initialize a temporary Git repository; the same tests passed outside that restriction. No application tests/build were required.
