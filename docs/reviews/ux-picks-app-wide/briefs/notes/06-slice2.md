# Task 06 slice 2 (worker note)

Done: src/workspace/preview/ (previewController, previewContext, GhostOverlay, PreviewHost, ghost.css, ghostOverlay.test.tsx); hover wiring in RangePuck (track), CountPuck (-/+), Slider and CountSetter (`onHoverValue`), tools SectionBody; PreviewHost mounted inside the board-cards layer in BoardCards; key `puck_preview_value` in workspace-pucks.ts (sl/en).

Design: one rAF loop runs only while a ghost is held; each frame it reads the shown box (`fitted() ?? intent().box`; `setFitted` does not notify) and the store version, and recomputes only when the value, box or version changed. Snapshot = `exportPreset()` + state, cached per store version. Context-based hover (`usePreviewHover`) so controls need no graph prop.

Checks: see 06-slice2.log (`just unit src/workspace src/inputs` + phase portrait preview: 570 passed, 12 skipped, 44 files), tsc 0 errors, lint passed. Deliberate break (preview of non-previewable parameter allowed) failed 1 test, restored. Browser: 06-slice2-browser.cjs/.log (+ 06-slice2-ghost.png).

Gap closure (tools): Slider and CountSetter keep their own `hint` state and show `<span class="hover-hint" aria-hidden>` (Klik: v, via `puck_preview_value` and the control's formatter, CSS in Slider.css/CountSetter.css, absolute under the control, no focus, no layout shift). Tests: src/workspace/preview/toolsHover.test.tsx (4: slider ghost+hint and leave, slider touch, count minus/plus, count bound + touch). Deliberate break (hint render off, bound check removed) failed 2 tests (06-slice2-tools-break.log); restored, all pass (06-slice2-tools-full.log; tsc 0 errors; lint passed). Frame-change clearing: already covered by ghostOverlay.test.tsx 'a change of the lesson frame clears the ghost'.

Not done: browser check of the tools hover: on the phase portrait `phase-a` is a board puck only (placement board), so Orodja holds no previewable slider; hover there is unit-tested only. No shot taken. Keyboard focus shows nothing (decided); Bezier/Taylor not previewable yet.

Review fixes (slice 2): Slider unmount cleanup + thumb inset (THUMB_WIDTH 20, Slider.tsx); pucks end the preview on lock/non-previewable (active ref); tests in toolsHover.test.tsx and ghostOverlay.test.tsx. Red logs 06-slice2-fix-red.log, -red2.log; green 06-slice2-fix.log; tsc 0, lint passed.
