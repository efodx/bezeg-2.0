# Task 0 evidence

Accepted 2026-11-07 against `8442fd6f`. Result: [inventory](inventory.md). Decisions: [spec](../../specs/shared-graph-controls.md#decided-in-task-0--2026-11-07). Raw parts, the signal table and the shared brief are in [the review folder](../../reviews/feature-streams/controls/).

| Criterion | Evidence |
| --- | --- |
| Every panel has a row | 134 rows. A script matched the 148 signal files against the parts: 146 named, and the other two covered by a combined row and a Controls row |
| Every capability has a target or a decided exception | Spec catalogue and *Likely exceptions* |
| Items 1–8 answered | Inventory *Open items*. Item 8 ran on a production build; the rest were read from code |
| Exceptions and Reset removals recorded | Spec *Likely exceptions*, *Decided in task 0* and *User impact* |

Handler checks against source: `axisPoint` silent refusal, the `fitView` seam, host Fit against EulerLine `placeShown`, Monotone's 0-based step, `clampGrid`, `LessonSession.applyActions` with `GuidedLesson.refresh`, unconditional `fit()` in the three `addPoint` methods, and the `workspaceEdit` branch. Decasteljau, the sampled bezier graphs and ArcLength were checked for having no typed field; the other rows of the typed-path table rest on part 3b.

Deviation: task 0 names port 4317 for the browser check. Codex's `lesson-navigation-prototype` dev server held that port with `--strictPort`, so the check ran on 4327 and that server was left running.

Gaps: no screen reader was run, Sequence's certificate-shown state was not played, and the view boxes for item 6 are nominal. The inventory's *Unverified* section lists the rest.
