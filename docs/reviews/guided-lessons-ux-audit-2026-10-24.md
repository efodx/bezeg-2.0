# Guided lessons UX/UI audit

Date: 2026-10-24. Audited source: `d0a358c88967fad5336147a1f6f9503a1dd11025`.
Method: Impeccable audit, source inspection and live production-preview browser inspection. No application changes. Surface mode: Operate, with Read requirements for lesson prose.

## Implementation integrity verdict

**Pass, with a significant accessibility defect.** The mathematical content, elderflower palette, readable formulas, explicit observation prompts and graph handoff form a coherent educational workspace. Preserve that direction. The primary problem is interaction hierarchy and state presentation, rather than a need for a new visual identity.

The source detector reports palette/radius advisories in `GuidedLesson.css`. These verify literal values, but are not automatically visual defects: `DESIGN.md` explicitly documents the shell/homepage rather than the full workspace. No dark-mode deficiency is asserted; dark mode is outside the documented design contract.

## Executive summary

**Provisional health score: 12/20 — Acceptable; significant work needed.** Eight findings: **0 P0, 1 P1, 6 P2, 1 P3**. Scores are a prioritization aid for the inspected sample, not a WCAG certification or a measured performance benchmark.

| Dimension | Score / 4 | Evidence |
| --- | --- | --- |
| Accessibility | 2 | Hidden graph points remain keyboard-focusable behind the lesson. Named controls, progress status and exit-dialog isolation are positive. |
| Performance | 3* | Sampled transitions completed without an obvious stall; route loading is explicit and motion is short. No instrumented interaction or bundle benchmark was performed. |
| Theming | 2 | Shared workspace roles coexist with many literal lesson colors and radii. Shell detector advisories need workspace-specific interpretation. |
| Responsive design | 2 | Narrow layout wraps without observed document overflow, but persistent controls and desktop viewport budgeting reduce useful reading space. |
| Implementation integrity | 3 | Product-specific and coherent; competing actions and completion presentation weaken the flow. |
| **Total** | **12/20** | **Acceptable** |

*Performance score is provisional and should not justify renderer, caching or memoization changes. Measure representative graph interactions before considering those changes.

## Coverage and limits

- Built the clean checkout using `just build`: passed, with build warnings recorded in `.command-logs/2026-10-24T09-16-59-444Z-72516-6ab9ce92.log`.
- Ran the bundled source detector against `GuidedLesson.tsx`, `GuidedLesson.css` and `GuidedLessonLayout.css`; reviewed its palette/radius advisories against the scope of `DESIGN.md`.
- Used the local production preview in the in-app browser. Inspected Taylor explanation, calculation and observation frames; hide/reopen; language switching; early-exit dialog and Escape cancellation; Learning and Demonstrations discovery; and all 13 Bézier frames through completion and completed-session exit.
- Inspected rendered layouts at 1280×720, 1440×900, 390×844 and 844×390. Measured element rectangles through the rendered DOM. At 390px and 844px widths the inspected document scroll widths did not exceed the viewport.
- Keyboard evidence includes Tab traversal into an obscured graph point and Escape cancellation. This was browser viewport emulation, not a physical-device or synthesized-touch test.
- Not covered: full lesson catalog traversal, animated playback, Presentation mode, physical projection, touch gestures, screen-reader speech, 200% text enlargement, exhaustive contrast measurement, graph-drag performance or restoration fault injection. Existing tests were read for context, not rerun as audit evidence. This is not a full smoke-test pass.

## Detailed findings

### 1. [P1] Keyboard focus enters graph objects hidden behind instructions

**Category:** Accessibility. **Location:** `src/graphs/base/DemonstrationWorkspace.tsx:117,251`; `src/learning/runtime/GuidedLessonLayout.css:10`.

**Evidence:** In the English Taylor calculation frame, pressing Tab from Next frame focused SVG ellipse `jgbox_jxgBoard1P43`, which has `tabindex="0"`. The graph reported `data-lesson-locked="true"`. A center-point hit test returned the overlying `guided-lesson-navigation` region. Pointer events are blocked and the inspector is inert, but the graph subtree is not inert. Fit to points also remains enabled while other graph navigation buttons are disabled.

**Impact:** Keyboard users lose visible focus behind the reading surface and encounter controls belonging to an apparently unavailable graph. This is a concrete focus-obscuring failure, relevant to WCAG 2.2 SC 2.4.11 and 2.4.7.

**Recommendation:** Apply consistent keyboard and assistive-technology isolation to the graph subtree during reading, with explicit restoration on hide, completion and unmount. Keep the lesson panel and its surviving reopen action outside that inert subtree. Verify graph-point traversal and Fit to points, not just inspector buttons. **Command:** `$impeccable harden`.

### 2. [P2] Desktop persistent navigation can start below the viewport

**Category:** Responsive design. **Location:** `src/learning/runtime/GuidedLesson.css:9,45` and workspace heading layout.

**Evidence:** On initial Taylor entry at 1280×720, the panel began at y≈271 and ended at y≈803. Its footer occupied y≈688–770, placing the forward controls below the viewport. The 74vh panel cap does not budget for the header and workspace heading above it. A learner must scroll the document before the internally persistent footer becomes useful.

**Impact:** The opening screen presents dense reading with no visible forward action, despite the desktop design's persistent-navigation intent. This is a usability finding, not evidence of an unreachable control or a WCAG failure.

**Recommendation:** Budget the reading panel against available viewport space or compact the lesson workspace heading; retain a usable prose region and document-flow fallback at short heights. Recheck initial entry at 1280×720 as well as larger desktop/projection sizes. **Command:** `$impeccable adapt`.

### 3. [P2] Observation frames offer competing routes forward

**Category:** Implementation integrity / action clarity. **Location:** `src/learning/runtime/GuidedLesson.tsx:441–446`.

**Evidence:** Taylor's first observation displays Previous frame, Next frame and Observe on the graph. Next frame advances without performing the experiment; Observe hides the panel. Hide lesson instructions performs the same handoff as Observe. The Bézier walkthrough also reached completion through Next alone, without entering its graph tasks.

**Impact:** Learners must infer which action follows the intended learning sequence. Allowing optional skipping is consistent with the specification; presenting that skip as the ordinary Next action makes its consequence unclear.

**Recommendation:** Make Observe the primary observation-frame action and give optional skipping an explicit secondary label. Consolidate duplicate handoff actions where possible. Keep navigation optional; do not add assessment gates. **Command:** `$impeccable clarify`.

### 4. [P2] Small-screen controls consume excessive reading space

**Category:** Responsive design. **Location:** `src/learning/runtime/GuidedLesson.css:89–101`.

**Evidence:** At 390×844, the Taylor observation footer measured ≈198px tall (23.5% of viewport height), with Hide, Exit, progress, Previous, Next and Observe. The prose region additionally reserves a fixed 320px of bottom padding, producing a substantial blank tail. At 844×390, even the calculation-frame footer measured ≈141px (36% of viewport height), while a disabled inspector still occupied the right column.

**Impact:** Small screens devote a large share of space to repeated controls and inactive tools. Reading remains possible through document scrolling, but the workspace feels substantially more crowded than necessary.

**Recommendation:** Combine the duplicate Hide/Observe handoff, reduce the persistent action set, size clearance to the actual toolbar, and evaluate removing inactive inspector space during short-height reading. Preserve explicit Exit access and 44px targets. **Command:** `$impeccable adapt`.

### 5. [P2] Graph exploration removes the current task and progress

**Category:** Implementation integrity / orientation. **Location:** `src/learning/runtime/GuidedLesson.tsx:401`; `src/graphs/base/DemonstrationWorkspace.tsx:198–202`.

**Evidence:** Hiding an observation removes its complete prompt and step/frame status. The host shows Back to the instructions, Continue lesson and Exit lesson. Taylor's specific instruction to compare degrees 3 and 6 disappears; the separate Try and observe region provides a general demonstration prompt rather than the current lesson task.

**Impact:** Learners must remember the exact task or repeatedly reopen instructions, temporarily losing access to the graph each time. This is especially costly for multi-part observation prompts. The alternating read/explore arrangement is an intentional existing decision; the usability risk is the loss of concise context within it.

**Recommendation:** Test a short current-task cue and compact progress beside the graph's external lesson controls. Keep full instructions reopenable and keep chrome outside the plotting area. This changes an accepted interaction tradeoff and needs a bounded proposal before implementation. **Command:** `$impeccable shape`.

### 6. [P2] Completion invites exploration while still covering the graph

**Category:** Implementation integrity / completion clarity. **Location:** `src/learning/runtime/GuidedLesson.tsx:433`; `src/learning/runtime/GuidedLesson.css:1–23,71`.

**Evidence:** Completing all 13 Bézier frames leaves a large, mostly empty panel over the graph. It says the final scene is ready for free exploration, but the visible choices remain Hide lesson instructions and Exit lesson. The Lesson complete status sits at the bottom. Completed-session exit closes directly and returns focus to Learn this demonstration.

**Impact:** The success state does not provide the direct action its message promises. Hide and Exit retain procedural language after the learner has finished.

**Recommendation:** Use a compact completion state with an explicit Explore this graph action that dismisses the panel while preserving the final scene. Put completion acknowledgment near the message and remove the large empty reading area. Keep completion distinct from early-exit restoration. **Command:** `$impeccable clarify`.

### 7. [P2] Learning does not signpost the existing guided lessons

**Category:** Implementation integrity / discoverability. **Location:** `src/learning/LearningPage.tsx:15–31`.

**Evidence:** The Learning destination lists the Bézier study chapter, while the Demonstrations catalog exposes Guided lesson links across the available demonstrations. Learning has no signpost explaining where those guided lessons live.

**Impact:** A learner looking for guided instruction through the Learning navigation may infer that the sole study chapter is the available learning inventory. This is an information-architecture judgment, not a broken route.

**Recommendation:** Add a clear link and brief distinction between study chapters and guided lessons in Demonstrations. Preserve the separate chapter and demonstration routes; avoid duplicating the full catalog. **Command:** `$impeccable clarify`.

### 8. [P3] Lesson styling lacks shared semantic roles

**Category:** Theming. **Location:** `src/learning/runtime/GuidedLesson.css:15–23,42,54,73–78`.

**Evidence:** Lesson surfaces, ink, action colors and radii are repeatedly literal. The detector flags colors such as `#3b6704` and radii such as 7px and 12px against the shell's documented palette/scale.

**Impact:** Future refinements need coordinated edits and can drift between lesson buttons, dialogs and workspace controls. The current elderflower identity is coherent; these warnings do not establish that the workspace must adopt the homepage's exact values.

**Recommendation:** Document the intended workspace roles, then consolidate repeated values into semantic variables while preserving their appearance. Do not repair DESIGN.md scope as a side effect of unrelated fixes. **Command:** `$impeccable document`.

## Patterns and strengths

The recurring issue is that reading, graph exploration and completion share controls whose prominence and labels do not fully adapt to their different tasks. Fix that state hierarchy before changing typography or adding visual decoration.

Preserve the opaque reading surface, legible mathematical notation, labeled local formula regions, conventional Previous/Next controls, polite progress status, named actions, 44px lesson targets, and default Slovenian with aligned English content. Exit confirmation clearly explains restoration and unsaved progress, starts on the safe action, isolates the background and responds to Escape. Hide/reopen preserved the inspected frame; completed-session exit avoided the early-exit warning. Source inspection also confirms explicit reduced-motion handling and paused playback around handoffs; animated behavior was not exercised here.

## Recommended action sequence

1. **P1 — `$impeccable harden`:** isolate graph keyboard targets while reading; verify focus across hide/reopen and completion.
2. **P2 — `$impeccable clarify`:** establish Observe versus Skip, improve the completion action, and signpost guided lessons from Learning.
3. **P2 — `$impeccable adapt`:** correct initial desktop footer visibility and shrink narrow/short-height chrome without shrinking targets.
4. **P2 — `$impeccable shape`:** evaluate a concise current-task cue during exploration against the existing graph-access decision.
5. **P3 — `$impeccable document`:** record workspace roles before consolidating lesson styles.
6. **`$impeccable polish`:** review the resulting states together in both languages, including keyboard, enlarged text and physical-device follow-up.

Re-run `$impeccable audit` after fixes. No redesign, implementation task files, new curriculum commitments or application behavior changes are authorized by this report itself.
