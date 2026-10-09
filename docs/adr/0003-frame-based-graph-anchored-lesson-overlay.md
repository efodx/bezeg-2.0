---
status: accepted
---

# Use frame-based graph-anchored lesson overlays

Agreed with the owner on 2026-10-09 as a refinement of the bounded Guided lesson plan. Guided lessons will use a graph-anchored overlay that keeps the graph visible, presents each conceptual step through bounded Explanation and Observation frames, and uses explicit transitions rather than a scrollable lesson document.

## Decision

1. Keep the existing conceptual lesson steps and add frames within them. An Explanation frame introduces one idea or formula; an Observation frame gives the learner a graph-focused action or prompt; an optional Calculation frame handles dense worked examples.
2. Do not use a nested scroll region inside the overlay. Content authors must fit each frame to a deliberate visual budget, splitting dense formulas or prose into separate frames instead.
3. In explanation mode, show a readable overlay with the graph visible but temporarily non-interactive. In observation mode, fade the explanation into a compact non-modal Exploration prompt so the graph becomes fully operable.
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

This ADR records the design direction only. It does not authorize implementation or create implementation tasks.
