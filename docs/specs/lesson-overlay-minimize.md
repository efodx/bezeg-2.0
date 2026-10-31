# Minimize Guided lessons to a graph overlay tab

## Scope and owner decision — 2026-10-25

The owner approved implementation after reviewing desktop/mobile layout options. Keep the existing lesson overlay on the graph. Replace the external reopen control with a small clickable overlay tab at the graph's top-left. (2026-10-31: top-left is now the tab's home placement; learners may drag it elsewhere on the graph. See [the lean, movable overlay](lesson-panel-visual-refinement.md#lean-movable-overlay--2026-10-31).) This supersedes the external-tab placement and narrow document-flow reading rules in `lesson-graph-access.md` and `lesson-experience-improvements.md` for this presentation only.

## Acceptance

1. Lessons start expanded. Hide instructions, Observe, and the existing Escape dismissal minimize to one compact button on the graph, showing the localized lesson label, step progress, and expand icon. The entire tab reopens the full overlay. No Previous/Next or Exit controls appear in the compact tab; remove redundant external reopen/continue/exit controls while minimized.
2. Expanded overlays have natural content height, without the empty space from stretching to graph height. Long content scrolls within a bounded reading region; minimize remains visible, including narrow/short screens and enlarged text. Short explanations leave some graph visible where space permits. Graph controls remain available outside the reading overlay.
3. Minimize/reopen retains the current frame, reading position, graph view and edits, and board identity. It never advances the lesson, prepares a scene, restores a checkpoint, or starts playback. Preserve paused playback behavior and existing explicit exit/restore and completion contracts.
4. Preserve the learner's visibility choice when advancing within a lesson; a new lesson starts expanded. Previous/Next and Exit remain available inside the expanded overlay. Observation frames retain one visible minimize action.
5. Keep coherent keyboard focus: minimizing focuses the compact tab; reopening focuses meaningful reading content. Support keyboard/touch, clear focus, at least 44px targets, SL/EN and no page overflow at 390px, 320px, short landscape, desktop and 200% text. Keep the tab compact at these sizes and available in Presentation mode.
6. No route, preset, mathematical content, geometry or scene ownership changes. Keep unrelated staged changes and the pre-existing unresolved evaluation-log conflict intact.

## Verification

Run focused lesson/workspace unit tests, typecheck, production build and delegated browser smoke for the shared lesson/workspace presentation. Cover Bernstein plus a long/observation lesson, actual graph interaction while minimized, reopen, frame navigation, exit, text enlargement, both languages and Presentation mode. Review the relevant diff against this spec and the engineering constraints. Record coverage and remaining gaps here.

## Implementation and acceptance — 2026-10-25

Implemented the compact localized step/frame tab over the graph, content-sized expanded overlay, bounded internal reading, and removal of external reopen/Continue/Exit actions. Playback controls remain available while observing animated frames. The graph retains its normal opacity. The expanded panel participates in the same overlaid graph grid cell so long reading can reserve space without covering the inspector; the board itself keeps its identity, dimensions and view. The closing panel becomes inert and focus moves immediately to the tab.

- Focused runtime/workspace tests: 35 passed; the compact-tab regression first failed against the old implementation. Typecheck passed. Stable production build passed (`.command-logs/2026-10-25T09-32-27-321Z-74156-0fab2f83.log`); warnings concern incumbent Sass deprecations and direct eval.
- Delegated smoke covered Bernstein, Taylor, C2 spline, observation/playback and shared reading/exit flows: 26 passed after the reading-height repair (`2026-10-25T09-28-46-179Z-88292-27dcc84c.log`). After the final narrow-label wrapping fix, all 13 responsive reading cases passed, including SL/EN at 320px and 200% text (`2026-10-25T09-33-37-747Z-105040-c5e2430e.log`). These are overlapping test runs, not 39 distinct cases.
- Manual Chromium coverage passed at 1440x900, 390x844, 320x844 and 844x390, including English at 200% text. Checked actual tab hits/44px height, opaque background, no inspector overlap, text containment, Escape/Enter, touch through the automated suite, Presentation, long reading scroll retention, actual Taylor parameter editing and board identity/view/dimension retention. With motion enabled, immediate tab focus, inert fading controls and rapid reopen passed. No browser console/runtime errors were observed.
- Independent engineering and UI/accessibility source reviews found one keyboard handoff issue, fixed and regression-tested. Browser checks then found and verified repairs for an empty reading region, desktop tab styles overridden by generic workspace buttons, and enlarged English labels spilling outside narrow buttons. Final screenshots are local `.command-logs/overlay-*.png` artifacts.
- The design detector reports the incumbent workspace palette/radii and two unchanged content accents outside the shell-only DESIGN.md scale. Physical devices/projectors were not tested. A broader full-unit attempt was interrupted during the integration repair; only the reported focused unit suite is a local pass.

The original checkout had an unrelated paused rebase and staged chapter changes. Verification and publication use a separate checkout based on `origin/master`; those unrelated changes and its conflict are preserved.
