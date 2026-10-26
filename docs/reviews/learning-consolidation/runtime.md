# Runtime implementation evidence

The workspace resolves guided examples through `resolveGuidedExample` and uses one `GuidedLesson` surface for Learn links, canonical chapter example links, legacy activity links, and family investigation links. The chapter `ActivitySession` is suppressed when that resolver returns an example. Separate activity and family investigation banners were removed; invalid legacy `explore` query cleanup remains active.

`GuidedLesson` shows the owning chapter and exact section, returns through the chapter link after safely restoring the lesson checkpoint, and offers “Continue in chapter” after completion. Completion leaves the final graph unlocked and editable until the learner exits or returns. `LessonSession.close({restoreCompleted: true})` supports those safe exits and unmount cleanup while the default close behavior remains compatible for other callers.

The short chapter example workspace regression checks the initial authored prompt, its observation frame, the graph observation action, the absence of the activity banner, and checkpoint restoration on return. Lesson tests cover midway restore and completion followed by explicit chapter return. Workspace navigation tests cover the legacy activity route and the family investigation route.

Focused verification passed 58/58 tests with:

```text
just unit src/graphs/base/chapterGuidedWorkspace.test.tsx src/graphs/base/DemonstrationWorkspace.test.tsx src/learning/runtime/GuidedLesson.test.tsx src/learning/chapter/useChapterActivity.test.tsx
```

Log: `.command-logs/2026-10-26T11-38-07-069Z-99440-afb11529.log`. The focused run includes invalid-`explore` cleanup. Production browser smoke was not run by this worker.

Final integrated outcomes and remaining limits: [acceptance](acceptance.md). Earlier unperformed checks above describe this worker's bounded run.
