# Improve the Guided lesson experience

**Presentation update, 2026-10-25:** [Minimize Guided lessons to a graph overlay tab](lesson-overlay-minimize.md) supersedes the external reopen controls, stretched reading frame and narrow document-flow prose rules. It retains the scene, playback and explicit-exit contracts recorded here.

**Status:** released; [implementation evidence](../reviews/lesson-experience-improvements/implementation.md) recorded on 2026-10-21. The [2026-10-24 owner policy](../guardrails.md#release-policy--owner-decision-2026-10-24) removes language, formative/classroom and physical-device/projector gates, superseding conflicting historical criteria below. The [later UX audit](../reviews/guided-lessons-ux-audit-2026-10-24.md) records concrete follow-ups.
**Source:** [Taylor UX review](../reviews/lesson-graph-access/ux-review-2026-10-21.md).
**Related contracts:** [Guided lessons](guided-lessons.md), [graph access](lesson-graph-access.md), [standalone learning](standalone-learning.md), and [guardrails](../guardrails.md).

## Problem Statement

Students reading a Guided lesson can lose access to progress, hide, and exit controls as the entire Lesson overlay scrolls. Vertical navigation rails are difficult to discover. At narrow widths the page and overlay both scroll, making reading and navigation compete. Faint graph labels and curves show through formula-dense prose. An accidental Exit immediately ends the session and restores the pre-lesson scene without explaining that Lesson progress is not saved.

The Taylor review observed these behaviors on desktop and at 390×844. It also identified strengths worth preserving: explicit step/frame counts, prediction before revealing an error estimate, responsive graph feedback, and hide/reopen that retains the current frame and edited scene. The reviewed deployed revision was unknown; the review did not establish frequency of learner difficulty or cover every lesson, keyboard access, assistive technology, or animation timing.

## Solution

Keep a calm, opaque reading surface with visible progress and conventional horizontal navigation. On desktop and projection, only the prose region scrolls; essential controls remain outside it. On narrow screens, prose uses document scrolling with compact persistent actions, eliminating a second vertical reading scrollbar.

Preserve the deliberate reading-to-graph handoff. Observe/Hide releases the graph, the workspace lesson tab reopens the same instructions, and Continue advances. Confirm an explicit early exit, explain restoration and unsaved progress, and let learners safely continue instead. Completion still retains the final scene for exploration.

Once shared interactions work, shorten and refocus Taylor's opening frames while retaining the mathematical explanation and prediction → experiment → reveal sequence. Other lessons receive the shared UI improvements; broader content rewrites require their own evidence.

## User Stories

1. As a student, I want to see my current Lesson step and Lesson frame while reading, so that I know where I am in the sequence.
2. As a student, I want horizontal Previous and Next buttons with readable labels, so that I can recognize how to navigate.
3. As a student, I want navigation available after scrolling a long explanation, so that I can proceed without finding the top again.
4. As a student, I want hide and exit actions reachable throughout reading, so that I can choose my next activity deliberately.
5. As a student, I want the beginning of a newly selected frame to be visible, so that I do not miss its introduction.
6. As a student, I want unavailable backward navigation indicated on the first frame, so that the lesson boundary is clear.
7. As a student, I want progress to explain transitions between frames and steps, so that crossing a step boundary is understandable.
8. As a student, I want the final action labeled as completing the lesson, so that its outcome is clear.
9. As a student, I want Observe on the graph reachable from the Observation frame, so that I can perform the task after reading it.
10. As a student, I want graph curves and labels hidden beneath the reading surface, so that they do not compete with formulas and prose.
11. As a student on a narrow screen, I want one vertical scrolling surface for lesson prose, so that reading does not require managing nested scrollbars.
12. As a student using enlarged text, I want text and actions to wrap and remain reachable, so that I can read without losing navigation.
13. As a touch user, I want adequately sized, separated lesson buttons, so that I can activate the intended action.
14. As a keyboard user, I want logical focus order and visible focus, so that I can operate every essential lesson action.
15. As a screen-reader user, I want meaningful action names and concise progress announcements, so that I can follow the sequence without relying on layout.
16. As a student, I want Hide instructions to preserve my frame, graph edits, and view, so that exploring does not restart the lesson.
17. As a student, I want reopening instructions to return to the same reading context, so that I can consult the task while experimenting.
18. As a student, I want Continue lesson to advance exactly once, so that reopening instructions and progressing have distinct outcomes.
19. As a student, I want a clear graph after hiding instructions, so that I can reach the relevant points, annotations, and parameter controls.
20. As a student, I want playback to pause when I return to reading or request exit, so that the scene does not change while I decide what to do.
21. As a student, I want reopening or canceling exit to leave playback paused, so that motion restarts only when I request it.
22. As a student, I want an early-exit confirmation explaining scene restoration and unsaved progress, so that I understand the consequence.
23. As a student, I want canceling exit to preserve my frame, scene, instruction visibility, and URL, so that an accidental activation is reversible.
24. As a keyboard user, I want Escape to dismiss an exit confirmation without hiding the instructions behind it, so that a single key has one predictable effect.
25. As a student, I want confirmed exit to restore the graph I had before entering the lesson, so that my earlier exploration is recoverable.
26. As a student, I want completion to retain the final scene without an early-exit warning, so that I can continue exploring what I learned.
27. As a student entering a lesson from a Chapter activity, I want return and scene ownership to remain coherent, so that the activity and lesson do not overwrite each other unexpectedly.
28. As a Slovenian-speaking student, I want clear Slovenian controls and explanations, so that I can learn in the app's default language.
29. As an English-speaking student, I want equivalent controls and content, so that language selection does not change the lesson's meaning.
30. As an educator projecting a lesson, I want readable prose and predictable graph access in Presentation mode, so that I can guide a class.
31. As a student sensitive to motion, I want reduced-motion behavior and no automatic playback, so that the lesson remains comfortable to use.
32. As a Taylor learner, I want an opening question and the minimum prerequisite notation before the detailed explanation, so that I understand the purpose of the experiment.
33. As a Taylor learner, I want focused frames that retain necessary definitions and assumptions, so that shorter reading does not weaken the mathematics.
34. As a Taylor learner, I want to predict and compare degrees 3 and 6 before revealing the estimate, so that the graph helps me test my reasoning.
35. As a Taylor learner, I want actual error and its upper bound distinguished, so that I do not mistake an estimate for the measured error.
36. As a student, I want unsupported scene actions or restoration failures explained with a recovery action, so that I am not left in an apparently successful but inconsistent lesson state.

## Implementation Decisions

### Ownership and compatibility

- Retain the existing Guided lesson presentation, LessonSession, workspace host, typed Graph actions, and graph-owned scene capture/restore boundaries. Do not introduce a new testing API or scene owner.
- Presentation state owns instruction visibility, reading position, responsive layout, and exit confirmation. LessonSession remains responsible for progression and scene lifecycle. Rendering controls must not create mathematical objects.
- Keep the board mounted while hiding/reopening instructions, opening/canceling exit, or changing reading layout. Preserve scene edits, graph view, and current frame for those actions.
- Retain direct Demonstration routes, lesson query context, unrelated URL query/hash state, Preset storage/export formats, and static client-only hosting. Lesson progress remains transient; no migration or saved-progress claim is introduced.
- Preserve existing scene reapplication when navigating between frames or steps. Visibility changes never invoke navigation or scene preparation. Added Taylor frames must not unintentionally reset an experiment.

### Reading layout and navigation

- Replace vertical navigation rails with horizontal text buttons. Suggested reviewed labels are Prejšnji okvir / Previous frame, Naslednji okvir / Next frame, and Zaključi učno pot / Complete lesson at the end.
- Desktop/projection uses a compact header, independently scrolling content body, and persistent footer. Header actions include Hide and Exit; footer actions include progress and Previous/Next. Observation actions remain reachable in the persistent action region. Avoid duplicate equivalent forward actions in the same view.
- Narrow reading uses normal document flow and page scrolling for prose. A compact persistent toolbar keeps progress, navigation, hide, and exit reachable. Reserve enough space that it cannot cover final content, formulas, or focused controls. No independent vertical scrollbar on the narrow Lesson overlay.
- Use the existing elderflower palette with an opaque reading background. Restore normal graph appearance and useful graph space when instructions hide. The narrow reading surface may occupy the graph cell's natural height while the board remains mounted and non-interactive behind it.
- Hide/Observe removes reading chrome from exploration and retains the workspace lesson tab and separate Continue action outside the plot, including Presentation mode. The graph must remain reachable without obscured task controls.
- [Compact lesson controls](lesson-mobile-controls.md) refines this on 2026-10-25: observation frames use Observe as their single hide action; narrow footers share button styling without an artificial reading spacer, and the supplemental workspace hint is hidden below 701px so tools follow the graph directly.
- On frame changes show the new heading and start of content. On same-frame hide/reopen retain reading position, clamped after translation or math reflow. Do not retain a previous frame's bottom scroll position on a new frame.
- First-frame Previous is disabled. Progress identifies both step and frame. Final-frame forward navigation explicitly completes the lesson.
- Essential targets are at least 44×44 CSS pixels. Both languages wrap at 390px and 200% text enlargement without document-level horizontal overflow. Wide formulas may scroll horizontally in a labeled local region.
- At short landscape heights or enlarged text, simplify persistent chrome or use document-flow reading when header/footer space would prevent useful reading. Do not clip prose or permanently reduce the graph to make the layout pass.
- Hide moves focus to the surviving workspace lesson tab; reopen focuses meaningful reading content. Keep keyboard order coherent and focused elements visible outside sticky regions. Retain reduced motion and no autoplay.

### Exit and completion

| Event | Observable result |
| --- | --- |
| Request early exit from reading or workspace controls | Pause playback and open one confirmation; leave scene, progress, instruction visibility, and URL intact. |
| Cancel, dismiss, or Escape in confirmation | Dismiss only the dialog, restore focus to its invoker, retain current state, and leave playback paused. |
| Confirm early exit | Stop transient activity, restore the entry checkpoint once, remove lesson context through the host, and focus the lesson-entry action. |
| Escape while reading without a confirmation | Hide instructions using the current behavior; do not request exit. |
| Complete final frame | Retain the final scene and allow exploration without an early-exit confirmation or checkpoint restoration. |
| Browser navigation, unmount, or Chapter activity return | Retain existing lifecycle cleanup and chapter ownership rules; do not add browser navigation interception. |

- The dialog explains that exit restores the graph from before the lesson and the learner's place is not saved. Use Continue lesson as the safe initial focus and Exit and restore graph as the explicit confirmation, with equivalent Slovenian wording.
- The dialog contains focus, isolates background controls, and does not stack on repeated requests. Route disposal removes it without invoking confirmed exit a second time.
- Restore failure must not be presented as successful exit: expose an actionable error and a safe recovery path consistent with existing error handling. Test the failure boundary without introducing overlapping scene ownership.
- Reopening instructions is the session's return mechanism. Confirmed exit, reload, and navigation do not promise resume. Completion and explicit early exit remain distinct operations.

### Taylor content pilot

- Introduce the purpose, minimum prerequisites, and comparison task before detailed exposition. Use focused Explanation, Calculation, and Observation frames without an arbitrary word-count or one-screen limit.
- Preserve the prediction sequence: compare degrees 3 and 6, inspect actual errors, deliberately reveal the estimate, and compare actual error with the bound. Verify the numerical claims against the graph rather than hardcoding the review's displayed precision as a universal result.
- Preserve definitions, assumptions, the distinction between actual error and a bound, and limits of Taylor approximation. Retain mathematical justification within the lesson rather than remove it for screen fit.
- Keep stable content identity, bilingual counterparts, supported Graph action identifiers, and existing mathematical capabilities. All symbols/formulas in prose use the project's required delimiters; dedicated LaTeX fields stay undelimited.
- Avoid repeating the full lesson summary when it crowds the current frame. Content rewrites are limited to Taylor; shared layout changes apply across Guided lessons.

## Testing Decisions

- **Confirmed testing seam:** the owner approved the existing lesson/workspace integration, with production browser checks for scrolling and layout. Test observable actions, focus, scene values, progress, and URL outcomes. Prefer that integration over new internal interfaces; use lower-level tests only where existing scene/lifecycle or mathematical seams provide necessary coverage.
- **Prior art:** existing Guided lesson presentation tests already cover content-first navigation, hide/reopen preservation, rapid handoff focus, Escape, Continue, animation pause, language changes, and completion. Existing LessonSession tests cover scene application and restoration. Chapter activity navigation tests cover shared graph ownership and history. Extend these suites rather than duplicate them.
- **Behavioral coverage:** verify top/middle/bottom action reachability, new-frame scroll reset, same-frame reading restoration, first/last-frame boundaries, one-step advancement, focus visibility, bilingual labels, and hide → edit graph → reopen → continue. Assert scene/view preservation and board identity, not merely CSS classes or callback counts.
- **Exit coverage:** both early-exit entry points, cancel/Escape preserving state, safe initial focus, dialog focus containment, background isolation, repeated requests, animation pause, exactly-once checkpoint restoration, restore errors, completion retaining the final scene, route disposal, and return to a Chapter activity.
- **Browser prior art:** extend the existing data-driven guided-lesson smoke suite and shared observation-flow checks. Keep every lesson represented in its table. Update existing exit assertions to confirm explicitly; do not bypass the new UI. CSS/unit assertions cannot establish actual scroll ownership or pointer reachability.
- **Responsive matrix:** record desktop/projection-sized, 390×844, short-landscape, and 200%-text views in both languages after settled math typesetting. At top/middle/bottom verify progress and essential actions are visible and operable, no sticky region covers content/focus, narrow prose has one vertical scroll owner, and essential touch targets are reachable.
- **Representative flows:** complete Taylor, plus a short lesson, formula-heavy lesson, animated lesson, Presentation mode, and a lesson inside a Chapter activity. Check keyboard-only operation, screen-reader names/progress announcements, reduced motion, pause/reopen, repeated entry/exit, board/listener cleanup, direct lesson URLs, and preservation of unrelated URL context.
- **Mathematics and content:** review the Taylor before/after outline, supported scenes, claims, reveal order, and degree/error observations. Run existing content and notation checks without weakening them. No numerical algorithms change; check observed values against existing mathematical behavior.
- **Commands:** start with the command inventory and follow the repository command guide. Run focused integration/content tests, type checking, production build, the guided-lesson smoke suite, and the full browser checklist for the shared UI change. Localization changes require the explicit TypeScript and production-build checks mandated by the project.
- **Review:** use the smoke-testing skill if available and report any absence with actual alternative coverage. Review the shared change in parallel for engineering and UI/accessibility; add mathematical review for the content slice. Record passed, failed, blocked, and skipped evidence, build provenance, language, viewport, and remaining limitations.
- **Learning evidence:** observe a small formative student/educator sample reading, advancing, experimenting, reopening, canceling exit, and exiting deliberately. Record hesitation, accidental navigation, and understanding of error versus estimate. Small samples do not establish a general success rate. Browser emulation does not close physical-touch or projector review.

## Out of Scope

Persistent Lesson progress; resume after confirmed exit or reload; accounts, backend, or cross-device state; quizzes or assessment; a new authoring system; mathematical algorithm or renderer changes; new graph capabilities; Preset migrations; route redesign; browser unload warnings; new Study chapters; catalog-wide content rewriting; declaring existing draft lessons classroom-ready.

## Further Notes

### Delivery and acceptance gates

1. **Baseline and layout proposal:** reproduce the Taylor review on a known production revision; record viewport, language, initial scene, and top/middle/bottom screenshots. Demonstrate desktop, narrow, short-height, enlarged-text, and Presentation layouts. Reuse existing accessible dialog conventions where suitable. Resolve layout feasibility before code scope expands.
2. **Shared reading shell:** implement persistent horizontal controls, opaque reading, responsive scrolling, and focus/reading-position behavior without content or scene-semantic changes. Gate on the integration tests, responsive acceptance matrix, and graph-access round trip.
3. **Exit protection:** add confirmation to both entry points. Gate on the exit event table, scene restoration, completion, error handling, and chapter-context checks.
4. **Taylor pilot:** refocus bilingual frames after the shared UI works. Gate on mathematical/content review, complete bilingual and narrow lesson walks, and preserved prediction/reveal order.
5. **Review and rollout:** resolve shared regressions, collect formative evidence, and document remaining physical-device/classroom gates. Extend content work only after per-lesson evidence warrants it.

Commit independently reviewable slices. Follow the delegation workflow before dispatching bounded implementation work; the handler owns scope, verification, review, commits, and publication. Create implementation task files only when work is intended to proceed.

The [existing overlay ADR](../adr/0003-frame-based-graph-anchored-lesson-overlay.md) retains the frame model, explicit graph actions, and graph-owned animation. This specification refines its reading-surface visibility and narrow scrolling choices while preserving separate exploration. During implementation reconcile conflicting vertical-rail, translucency, and scrolling clauses in the Guided lesson and graph-access contracts, and record the adopted rationale in the ADR. Preserve [shared Demonstration ownership](../adr/0014-study-chapters-share-demonstrations.md) for chapters.

User-visible changes are horizontal navigation, persistent actions, opaque reading, narrow page scrolling, early-exit confirmation, and Taylor frame pacing. Frame counts may change; there is no stored-progress migration. Record the reason and user impact in implementation evidence. Rescope any discovered requirement to alter routes or scene semantics before implementing it.

This specification is the repository-local equivalent of a ready-for-agent issue. Project instructions require repository-local planning with no external issue tracker, so no external issue or triage label is created. Testing seams were explicitly confirmed by the owner. Publishing the specification does not implement the feature or close UX/content/classroom review gates.

The original specification publication was documentation-only. Implementation evidence now records application/browser checks separately from remaining formative and physical-device gates. The source report's unknown deployed revision and limited sampling remain evidence constraints; the implementation baseline uses a known local production revision.
