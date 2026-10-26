# Engineering review 2

Review of `ad37517` plus the current illustrated-example changes, scoped to ordered chapter rendering, retained-example resolution/ownership, and capture inventory tooling.

## Finding

- **[P2] Reject a canonical example query mixed with another route identity** — [guidedExamples.ts:139](../../../src/learning/chapter/guidedExamples.ts:139). `retainedHomeFromSearch` accepts a single `example` parameter whenever `explore` and `activity` are absent, but it does not reject `chapter`, `learnChapter`, or `learnSection`. Consequently `resolveGuidedExample('?example=lesson.analysis.convergence.sequence&chapter=bezier-curves', 'sequence')` resolves the retained lesson and silently ignores the conflicting chapter. The later `canonicalExample` guard rejects `chapter`, but is bypassed because the retained-home lookup succeeds first. Add the same route-key conflict checks before resolving a retained alias and cover mixed `example`/`chapter` and `example`/`learnChapter` inputs in `guidedExamples.test.ts`; both should return `undefined`.

## Reviewed evidence

The 56 retained homes are rendered only at authored `example` blocks; `authoredChapterCoverage.test.ts` checks all eight chapters, both languages, exact home placement, unknown references, duplicates, and total uniqueness. The 175-row baseline test checks each legacy identity/activity maps to its expected home and owner. No runtime chapter module imports review JSON. The inventory generator resolves every canonical home, hashes its initial scene actions and first frame, and requires nonempty prepared actions; capture validation rejects empty boards, missing geometry/samples, stale mappings, missing assets, and checksum changes. Those checks are meaningful, though final media capture and visual acceptance remain pending.

No build, browser, or media acceptance was performed as part of this read-only review.

## Targeted rereview

**P2 closed.** The retained `example` branch now rejects `chapter`, and `resolveGuidedExample` rejects standalone `learnChapter`/`learnSection` before alias resolution. The new regression test covers all three mixed ownership keys; the handler reports it passing. No remaining case found in this narrow rereview.
