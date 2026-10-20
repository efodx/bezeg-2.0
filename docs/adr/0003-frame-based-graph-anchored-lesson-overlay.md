---
status: accepted
---

# Use frame-based graph-anchored lesson overlays

Agreed with the owner on 2026-10-09 as a refinement of the bounded Guided lesson plan. Guided lessons will use a graph-anchored overlay that keeps the graph visible, presents each conceptual step through bounded Explanation and Observation frames, and uses explicit transitions rather than a scrollable lesson document.

## Decision

1. Keep the existing conceptual lesson steps and add frames within them. An Explanation frame introduces one idea or formula; an Observation frame gives the learner a graph-focused action or prompt; an optional Calculation frame handles dense worked examples.
2. Content authors should fit each frame to a deliberate visual budget, splitting dense formulas or prose into separate frames. The 2026-10-20 graph-access refinement permits scrolling within the bounded reading region at reduced height or enlarged text, preserving access to essential actions.
3. In explanation mode, show a readable overlay with the graph visible but temporarily non-interactive. The owner-authorized [2026-10-20 refinement](../specs/lesson-graph-access.md#layout-decision--2026-10-20) replaces the movable Exploration prompt with a small labeled lesson tab outside the plotting area. Hide/Observe releases the graph, reopening restores the same frame, Continue advances, and explicit Exit restores the entry scene. Escape dismisses instructions without exiting. Hiding pauses active playback; reopening never starts it.
4. Use explicit arrows and Back/Next controls for frame and step movement. Transitions may fade or slide, but they must be cancellable and respect reduced-motion preferences.
5. Keep graph animation graph-owned and explicit. The first pilot animation is the De Casteljau construction, with Play/Pause/Replay controls, one pass from \(t=0\) to \(t=1\), and no autoplay or looping in lesson mode.
6. Treat scene restoration as the animation-cancellation boundary. Back, Next, Reset, Exit, route changes, and disposal must stop transient lesson animation before restoring or replacing graph state.

## Considered options

### Keep the lesson as a grid panel

Rejected because it pushes the graph down and leaves the lesson competing with the graph during exploration and presentation mode.

### Use a scrollable lesson drawer over the graph

Rejected because it turns the lesson into a second document workspace and makes it difficult to keep both readable content and a useful graph visible. Dense content will be split into bounded frames instead.

### Use ambient or looping animation

Rejected because it competes with reading, is unsuitable for reduced-motion users and classroom projection, and makes scene reset and learner attention harder to reason about.

## Consequences

- The content contract must represent frames without turning every frame into a separate conceptual progress step.
- Desktop and projection layouts can show lesson and graph together; narrow layouts may alternate emphasis between them.
- The runtime needs focus movement, live step/frame announcements, keyboard and touch-sized arrow controls, and restoration of focus on exit.
- Animation integration requires cancellation tests and graph-restore checks before visual polish is considered complete.
- Routes, browser-local Presets, export formats, and the client-only hosting model do not change.

The original ADR recorded design direction only. The owner separately authorized the graph-access implementation on 2026-10-20; its bounded scope and acceptance criteria are in the linked specification.
