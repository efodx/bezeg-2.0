# Improve the Guided lesson experience

**Status:** proposed improvement plan, 2026-10-21. This document prepares implementation scope; it does not start application changes or declare the UX findings resolved.
**Source:** [UX review of the Taylor lesson](../reviews/lesson-graph-access/ux-review-2026-10-21.md).
**Related contracts:** [Guided lessons](guided-lessons.md), [graph access](lesson-graph-access.md), [standalone learning](standalone-learning.md), and [guardrails](../guardrails.md).

## Outcome and evidence

Make reading, navigating, exploring, and leaving a lesson predictable. A learner should always know where they are, reach essential actions without hunting through prose, and experiment on an unobstructed graph.

The review sampled Taylor's opening, one experiment, one step transition, exit, and a 390×844 entry. It establishes concrete layout and exit behavior, not how frequently learners struggle or how every lesson behaves. The deployed revision was unknown. Record a reproducible production baseline before implementation and compare the same scenes after each slice. Keyboard, assistive technology, animation timing, other lessons, and classroom use remain untested by that report.

Preserve the strengths: explicit step/frame counts, prediction before revealing the error estimate, responsive graph feedback, and hide/reopen that retains the current lesson and edited scene. Do not redesign these successful interactions simply to shorten the opening.

Source inspection supports bounded changes:

- `src/learning/runtime/GuidedLesson.css` makes the entire lesson panel scroll, including its heading and progress, and renders navigation vertically on its edges. Its translucent background allows graph detail through.
- `src/learning/runtime/GuidedLesson.tsx` places hide, exit, progress, prose, and observation actions in that panel; its registered exit callback also needs the new exit behavior.
- `src/learning/runtime/LessonSession.ts` already separates navigation from checkpoint-restoring close. Visibility remains a UI concern.
- `src/learning/content/analysisGuidedLessons.ts` owns the bilingual Taylor lesson. Content changes can follow shared runtime improvements independently.

## Proposed interaction contract

### 1. Persistent navigation and a deliberate scroll model — highest priority

Replace the vertical edge rails with horizontal, text-labeled navigation. Keep step/frame progress visible beside the navigation, and keep Hide instructions and Exit lesson reachable throughout reading. Retain the current scene ownership and reading-to-graph handoff.

**Desktop and projection:** use a reading panel with three explicit regions: compact header, scrolling content body, and persistent footer. Only the content body scrolls. The header contains lesson identity and hide/exit; the footer contains progress and Previous/Next. Place Observe on the graph in the persistent action region on observation frames, with any additional frame action clearly labeled. Avoid two equivalent forward buttons in the same view. At the final frame, use a completion label rather than an ordinary Next label.

**Narrow screens:** place the reading surface in normal document flow and use page scrolling for prose. Keep a compact navigation/action bar within the viewport while reading; its reserved space must prevent it covering the last paragraph, formulas, or focused controls. Keep hide/exit reachable through a compact toolbar. Remove the lesson card's independent vertical scrollbar in this layout. Permit horizontal scrolling only for formulas that genuinely cannot wrap, within an identified local region.

Keep the board mounted while changing layout or instruction visibility. In narrow reading mode, the reading surface can take the graph cell's natural height without exposing a second interactive graph behind the text. On Observe/Hide, collapse the reading surface and its reading toolbar, restore useful graph space, and retain the existing workspace lesson tab and separate Continue lesson action outside the plot. Verify this with the workspace grid and Presentation mode before settling dimensions; do not obtain a passing layout by clipping text or shrinking the board permanently.

Proposed copy, subject to bilingual review: **Prejšnji okvir / Previous frame**, **Naslednji okvir / Next frame**, and **Zaključi učno pot / Complete lesson** at the end. Progress still identifies both step and frame; moving across a step boundary must remain understandable. Keep reopening distinct from advancing. Exact labels should fit at 390px in both languages with 200% text enlargement.

**Acceptance criteria**

1. At the beginning, middle, and end of the longest sampled reading frame, progress, previous/next, hide, and exit are visible and operable without scrolling back through prose. The observation action is equally reachable on an observation frame.
2. At 390×844, narrow reading has one vertical scroll owner for its prose. At a short landscape viewport and 200% text enlargement, controls wrap, remain reachable, and leave readable content space. If persistent regions consume that space, simplify their contents or switch to the document-flow reading layout rather than clip the body.
3. First-frame Previous is unavailable; subsequent navigation uses existing frame/scene operations. Frame changes reveal the new heading and beginning of its content, rather than inheriting the previous frame's bottom scroll position. Same-frame hide/reopen restores the reading position where practical, clamped after reflow.
4. Hide → edit graph → reopen retains frame, scene edits, view, and board identity. Continue advances once. Navigation retains its existing scene-reapplication semantics; reopening never invokes them.
5. Focus remains visible and outside sticky regions. Hide focuses the surviving lesson tab; reopen focuses meaningful reading content. Tab order follows the visible reading order, with no focus stranded in hidden content. No new required animation is introduced; reduced motion remains supported.
6. Essential buttons provide at least 44×44 CSS-pixel touch targets. Both languages, keyboard operation, Presentation mode, and math typesetting/reflow pass the same checks.

### 2. Safe, explicit exit — medium priority, before broader content work

Use a concise confirmation for an explicit early Exit lesson. This preserves the checkpoint contract without introducing saved-progress infrastructure. Renaming Exit alone would leave accidental activation destructive to the current lesson session.

The confirmation explains: **Exit restores the graph from before the lesson. Your place in this lesson is not saved.** Provide **Continue lesson** as the safe initial focus and **Exit and restore graph** as the explicit confirming action, translated into Slovenian and English. Review final wording against actual session behavior.

| Action | Required result |
| --- | --- |
| Request exit from reading or the workspace's hidden-instructions controls | Pause playback and open one confirmation. Do not close the session, restore the scene, or change the URL yet. |
| Continue lesson, dismiss, or press Escape in the confirmation | Close only the confirmation; retain progress, current scene, instruction visibility, and URL. Restore focus to the invoker. Playback stays paused. |
| Confirm exit | Run existing lesson cleanup once, restore the entry checkpoint, remove lesson URL context through the host, and focus the lesson-entry action. |
| Escape while reading, without a confirmation | Keep the current hide-instructions behavior. It must not exit or open the confirmation. |
| Complete the final frame | Keep the final scene for free exploration. Do not show an early-exit warning or restore the entry checkpoint. |
| Browser navigation, route unmount, or chapter return | Keep existing lifecycle and chapter ownership cleanup. Do not add navigation interception or a browser unload warning. |

A confirmation is not a resume feature. Progress remains in memory only; a later lesson entry restarts it. Do not promise recovery after confirmed exit, reload, or navigation. Hide/reopen remains the way to explore and return to the current frame during a session.

**Acceptance criteria:** cancel leaves scene/progress/URL unchanged; confirmation restores the captured scene exactly once; keyboard focus is contained in the dialog and returns appropriately; background controls cannot activate; Escape dismisses only the dialog. Repeated exit requests do not stack dialogs. Verify both visible and hidden-instruction exit entry points, animation pause, scene-restore errors, completion, and chapter-activity return.

### 3. Calm reading and a shorter Taylor opening — medium priority

Make the reading surface opaque using the existing elderflower palette. Curves, graph labels, and numerical readouts must not show through the prose. Restore the ordinary graph appearance when instructions hide. This visual change can ship with the navigation slice.

After that layout is working, edit Taylor as a bounded content pilot:

- Open with the question, the minimum prerequisite notation, and a brief statement of what the learner will compare.
- Put each substantial explanation or calculation into a focused frame. Avoid repeating the full lesson summary on every frame if it crowds the current task.
- Preserve the experiment's prediction sequence: compare degrees 3 and 6, inspect actual error, then deliberately reveal the estimate and compare it with actual error.
- Retain definitions, assumptions, distinctions between actual error and a bound, and the limits of Taylor approximation. Move detail within the lesson rather than delete mathematical justification merely to fit a screen.
- Keep Slovenian and English aligned, formulas correctly delimited in prose, and action IDs/graph capabilities unchanged. Any added frame needs stable identity and must be checked for unintended scene reset when traversed.

Do not set an arbitrary word count or require the opening to fit one phone screen at every text size. Judge the pilot by whether the first idea and next action are clear, then use the layout's scroll behavior for necessary mathematics. Do not migrate Taylor to a new chapter in this change; longer-form teaching remains part of the separate standalone-learning direction.

**Acceptance criteria:** review a before/after content outline; retain every mathematical claim needed for the experiment; verify the degree/error sequence against the real board; preserve reveal order; complete the entire revised Taylor lesson in both languages and at narrow width. Its existing classroom/content-review gates remain open until separately satisfied.

## Delivery sequence

| Slice | Deliverable and boundary | Gate before proceeding |
| --- | --- | --- |
| 0. Baseline and layout proposal | Record revision, viewport, language, initial scene, screenshots at top/middle/bottom, and the Taylor reading → experiment → return flow. Show desktop, narrow, and short-height layout proposals. Inspect existing dialog conventions. | Confirm the proposed layout handles long content, enlarged text, Presentation mode, and graph access without changing scene ownership. Record any newly discovered constraints in this spec. |
| 1. Shared reading shell | Persistent controls, horizontal navigation, opaque reading surface, responsive scroll ownership, focus and scroll handling. Preserve lesson content and runtime scene semantics. | Shared-runtime tests and browser review pass; compare baseline screenshots. Update Guided lessons interaction clauses and graph-access layout guidance. |
| 2. Exit protection | Accessible confirmation integrated with both lesson exit entry points; checkpoint, route, and completion regression coverage. | Cancellation and confirmed exit satisfy the action table, including chapter context and error handling. Update exit documentation. |
| 3. Taylor content pilot | Bilingual opening and frame sequencing improvements, with reviewed mathematical content and unchanged supported graph actions. | Full Taylor walk, mathematical checks, notation tests, language review, and first-use observation pass. |
| 4. Review and selective rollout | Inspect a short lesson, formula-heavy lesson, animated lesson, and chapter-hosted lesson; record which problems were shared and which were content-specific. | Shared layout regressions are resolved. Extend content edits only where a per-lesson audit justifies them; do not authorize a catalog-wide rewrite from one review. |

Keep slices independently reviewable and commit them separately. Before code delegation, follow [the delegation workflow](../agent-workflow.md). The handler owns scope, verification, review, and commits. Create task files only when their implementation is intended to proceed; this planning change creates none.

## Verification and release evidence

For this documentation-only plan, check links, consistency with the source report, and the working-tree diff. No application tests or browser smoke run is required to publish the plan.

For implementation, start with `just --list` and the [command guide](../commands.md). Use focused `GuidedLesson` and `LessonSession` tests for meaningful behavioral changes, plus chapter-activity tests where exit crosses that boundary. Cover navigation, visibility preservation, focus/dialog cancellation, exactly-once restoration, completion, playback cancellation, and startup/restore failures. CSS visibility assertions alone do not prove scroll or pointer reachability.

Run type checking and the production build for localization changes, keeping `sl.ts` and `en.ts` keys and placeholder types aligned. For Taylor content changes run the content tests and `src/learning/content/lessonMathNotation.test.ts` without weakening them. Compare graph values and prepared scenes; no numerical implementation changes are intended.

Because the shared lesson UI changes, run the existing guided-lesson smoke suite and the full [browser checklist](../smoke-tests.md) against the recorded production build. Extend existing smoke coverage for sticky actions after scrolling, one narrow reading scroll owner, confirmation/cancel, and revised frame traversal. Keep every lesson represented in the existing smoke table. Use `$smoke-tester` when available; if unavailable, report that limitation and the actual alternative browser coverage.

Capture desktop/projection-sized, 390×844, short-landscape, and 200%-text views in both languages. Check touch-target reachability, keyboard-only operation, visible focus, screen-reader labels and progress announcements, reduced motion, and settled MathJax layout. Validate direct `?learn=1` entry and explicit exit query handling without changing unrelated URL context. Include a complete Taylor walk, a short lesson, an animated lesson, and lesson entry/exit from a chapter activity. Repeated hide/reopen and exit/re-entry must not replace the board unexpectedly or leave active animations/listeners.

Ask a small formative sample of students/educators to read, find Next, perform the Taylor experiment, return to instructions, cancel an exit, and exit deliberately. Record completion, hesitation, accidental navigation, and whether they can explain the difference between actual error and its estimate. This informs follow-up content work; a small sample does not establish a general usability success rate. Keep physical touch and projector validation explicitly open if only browser emulation is available.

For the shared multi-file UI change, use parallel reviews for engineering constraints and UI/accessibility; add mathematical review for the Taylor content slice. Record pass/fail/blocked/skipped coverage and unresolved findings. Do not claim classroom readiness or deployed success from local tests alone.

## Compatibility, documentation, and exclusions

Proposed user-visible changes are horizontal navigation, persistent actions, opaque reading panels, a narrow page-scroll reading layout, early-exit confirmation, and revised Taylor frame pacing. Existing vertical-rail interaction clauses in [Guided lessons](guided-lessons.md) and [ADR 0003](../adr/0003-frame-based-graph-anchored-lesson-overlay.md) need reconciliation during implementation; the proposed scroll model also refines [graph access](lesson-graph-access.md). These are proposals until implemented and verified, not claims that the current contracts already changed.

Keep direct Demonstration routes, `?learn=1`, Preset formats/storage, mathematical algorithms, browser-local operation, and chapter/activity ownership. No persistent lesson progress, resume-after-exit feature, backend, accounts, new renderer, assessment, or chapter rollout. Taylor frame counts may change; progress is transient, so no stored-progress migration is needed. Record that visible count change in implementation evidence. If implementation discovers a need to change scene semantics or routes, rescope it explicitly before proceeding.
