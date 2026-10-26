# Registry and initial content batch handoff

Status: partial implementation; do not treat this batch as verified or complete.

## Owned changes in the shared worktree

- Added src/learning/chapter/retainedExamples.ts as an explicit, typed runtime map. It has the 56 audit-approved homes and 175 legacy aliases in app source; the app does not import the audit JSON. Home tuple fields are stable key, chapter, section, demonstration, original source id/kind, and canonical path. The typed lookup functions are getRetainedExampleHome, getRetainedExampleForLegacyIdentity, getRetainedExampleForLegacyActivity, and getRetainedExampleForLegacyOwner.
- Refactored guidedExamples.ts to publish retained keys as link IDs and route legacy canonical example, explore, and activity query forms through the alias map. Learned lesson owners are canonicalized by guidedLessonOwnership.ts. It appends merged short observation prompts to retained lesson frames. The media preview resolver can key on example.id and use the canonical example.path.
- Fixed the TS inference issue at getChapterGuidedExamples() by explicitly typing the flatMap callback output as GuidedExampleLink[].
- Updated ChapterGuidedLessons.test.tsx to use retained ID bezier-curves.parameter.decasteljau-parameter and route the preview callback by that ID.
- Added explicit Bézier orderedContent via authoredBezierSequence() in bezierChapter.ts, with localized ordering and stable references. It currently covers the Bézier sections and includes the interpolation and next-ideas sequences. Verify the insertion anchors/tests before considering done.
- Began Foundations edits in familyChapters.ts: section helper extras now permit orderedContent; the worked-weight prompt no longer implies that the graph plots (2,1) and instead compares degree-two and degree-three basis weights, noting weights alone do not locate controls. No Foundation ordered sequences have been added yet.

## Stable IDs / coordination

The media worker was notified that previewFor should use retained IDs. Example stable ID used in the changed renderer test: bezier-curves.parameter.decasteljau-parameter. Foundations worked-weight home key is foundations.worked-weight.bernstein.degree-comparison (audit's final corrected key). Existing separate spline fixture is still present in guidedExamples.ts: worked-parabola-join, with the original parabola data. Media worker reported the flatMap type issue; it has now been fixed and they were asked to rerun typecheck.

## Required continuation

1. Complete explicit Foundations ordered content only: reading-bernstein paragraph → foundations.reading-bernstein.bernstein → paragraph → figure; worked-weight paragraph → foundations.worked-weight.bernstein.degree-comparison → paragraph; complex-plane paragraph → paragraph → foundations.complex-plane.complex-multiplication → paragraph → formula → figure. Keep why-weights and investigate-limits prose-only. Preserve all existing section anchors.
2. Ensure the worked-weight Bernstein card starts at degree 2 with stacked area off. Suggested implementation is a narrow preparedFamilyActions(id, chapterId, sectionId) exception for (bernstein, foundations, worked-weight) returning bernstein-degree:2 and bernstein-stacked-area:false.
3. Add robust tests for all 175 aliases, all 56 homes, canonical/legacy routes, strict malformed/duplicate/mismatch rejection, typed ordered-content placement and bilingual sequence parity. Keep the existing spline-c1 parabola fixture assertion and add the specific spline regression if absent.
4. Update deliberate old-key assertions in guidedExamples.test.ts, guidedLessonOwnership.test.ts, ChapterPage.test.tsx, and related rendering tests to assert retained IDs/owners and correct routes rather than merely changing expected text.
5. Inspect the current bezierChapter.ts next-ideas anchor against its exact bilingual prose and test all localized sequences. Inspect the shared working tree first because the media and parent agents have active changes.
6. Write/run focused tests and exact npx tsc --noEmit --pretty false; demonstrate a relevant new regression test fails under a deliberate temporary mutation and restore it. Start via just --list. Do not run build/browser capture in this batch; media/capture work is separately owned.

## Verification

just --list was run and succeeded. No focused test, exact typecheck, build, or mutation demonstration was run after these edits. The media worker had reported only the now-fixed TS2345 in guidedExamples.ts:204 at the time of its message; that is not a fresh verification result. Current shared typecheck status is unknown.

No commit or push was made. Shared working tree contains unrelated/parallel changes; preserve them.
