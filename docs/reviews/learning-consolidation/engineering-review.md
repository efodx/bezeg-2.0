# Engineering and accessibility review

Review scope: consolidated learning diff against `dd7c414`, with focus on workspace ownership and cleanup, entry/return paths, chapter bookmarks and focus, responsive controls, and regression evidence. Read the feature spec and implementation task before review.

## Findings

No actionable engineering or accessibility defects found in the reviewed changes.

The workspace resolves legacy prepared-activity and family-investigation URLs into one `GuidedLesson`; the paired workspace tests assert one checkpoint capture, guided scene actions, absence of the competing activity/investigation surface, and checkpoint restoration on return. `LessonSession.close` preserves the completed scene by default and restores its checkpoint on explicit chapter continuation or safe exit. Failure paths keep the exit dialog available for retry. The short and canonical example mappings resolve to an authored owner, and the Splines `worked-join` prompt describes the worked parabola join.

Chapter links capture the section-relative scroll position and invoking link before navigation. The chapter return path restores that location after MathJax typesetting and focuses the invoking link. Lesson controls retain 44px targets, visible focus styles, wrapping action groups, and a bounded scroll region; the supplied test suite covers frame navigation, hide/reopen, keyboard focus, and narrow reading behavior.

## Evidence and limits

- Runtime worker's latest focused run passed 58/58 tests: `.command-logs/2026-10-26T11-38-07-069Z-99440-afb11529.log`.
- Earlier run `.command-logs/2026-10-26T11-27-11-548Z-86924-de212eef.log` recorded failures in the newly added overlap and restoration cases before the fixes, providing observed-red evidence.
- The catalog/ownership tests exercise every generated chapter example path and exact owner. `GuidedLesson.test.tsx` exercises next/previous frame controls and compact hide/reopen behavior.
- This is a code review. Production browser coverage for history Back/Forward, narrow/enlarged chapter layouts, and real graph editing after completion remains with the delegated smoke verification.
