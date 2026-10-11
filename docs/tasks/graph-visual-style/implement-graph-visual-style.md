# Implement the illustrated C visual style in the actual graphs

Status: ready for a new implementation agent. This document is the handoff, not an instruction to start implementation in the current documentation chat.

Source and acceptance criteria: [Graph visual style specification](../../specs/graph-visual-style.md). Portable examples: [style reference sheet](../../images/graph-visual-style/style-reference.svg). Production catalog context: [Expandable demonstration catalog](../../specs/expandable-demonstration-catalog.md).

## Assignment

Start from freshly fetched `origin/master` of `https://github.com/efodx/bezeg-2.0`; preserve unrelated local changes and follow AGENTS.md, docs/README.md, guardrails, and the delegation workflow. The handler owns scope/review/Git and delegates bounded implementation slices to GPT-6 Luna with Max reasoning. Do not assume this documentation checkout or the old prototype branch is current production.

Read the source spec first. Restyle the actual JSXGraph boards toward the illustrated C references, retaining real geometry, defaults, notation, controls, lessons, presets, and renderer. Use the reference images for color/hierarchy/line and marker treatment, not their hand-picked curve shapes. Include all current families, function graphs, and PH auxiliary boards.

1. Inventory shared styles, graph-specific overrides, color semantics in lessons, export behavior, and size/visibility controls. Capture matched production screenshots and representative interaction measurements before changes.
2. Implement a bounded pilot on ordinary Bezier, De Casteljau, rational Bezier, and cubic PH. Produce matched screenshots and inspect math labels, construction levels, selection, hover, drag targets, and projection/presentation readability. Resolve findings before spreading the shared treatment.
3. Roll out to the remaining current routes, preserving per-operation distinctions. Audit spline joins, multiple curves, construction levels, parameter markers, Bernstein curves, and function crossings. Keep the implementation focused on presentation.
4. Verify figure export and lesson color descriptions, regenerating SL/EN copy only when needed and preserving mathematical notation. Regenerate faithful catalog previews after the final graph styling; keep C's layout.
5. Obtain independent mathematical-fidelity and engineering/UI/accessibility review. Run the required type/build/test/browser/export/performance checks from the source spec, repair findings, and record evidence and limits there.
6. Commit logically separate verified changes, fetch and recheck fresh master, and follow AGENTS.md for fast-forward publication. Stop and report a rebase conflict rather than resolving unrelated work blindly.

## Deliver to the owner

Explain what changed visually and why. Show examples from actual matched scenes (Bezier curve, De Casteljau construction, PH offsets when already visible, spline joins, and a function graph). Report preserved behavior, checks/results, any known failures or incomplete coverage, and commit hashes. Provide a running preview or hosted result with clear build provenance. Do not report schematic pictures as proof of real graph fidelity.

## Copyable prompt

Implement `docs/tasks/graph-visual-style/implement-graph-visual-style.md` on fresh origin/master. Read its source spec and visual examples, then improve the actual graphs to match illustrated Variant C's calm elderflower style. Preserve real curve geometry/default settings, notation, constructions, controls, lessons, presets, and exports. Start with the four-route pilot, then roll out across current families and regenerate faithful catalog previews. Follow AGENTS.md delegation, review, verification, and Git requirements. This is graph presentation work; do not copy the prototype's arbitrary curve shapes or migrate the renderer.
