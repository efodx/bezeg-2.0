# Own numeric curve inputs before replacing the renderer

Accepted on 2026-10-09. Editable curve inputs belong to the mathematical model; adapters synchronize board edits and own their bindings. Keep JSXGraph for the first ownership foundation, give the main board an explicit lifetime and move capture into owned export modules. This reduces coupling across the existing demonstrations while preserving mathematical and teaching behavior; see the [implementation spec](../specs/curve-ownership-refactor.md).

Replacing JSXGraph immediately with custom SVG, Canvas or another drawing library would also require rebuilding axes, selection, gestures, dependent constructions, formula labels and export behavior. Retaining board-backed model inputs would preserve that coupling for any replacement. A comprehensive scene/command rewrite in one change would broaden the verification boundary beyond the first foundation. The chosen sequence accepts temporary graph-class scene hooks and existing global cache invalidation while establishing numeric inputs and disposal boundaries first.

The [renderer research](../research/curve-renderer-options.md) and [performance protocol](../performance-plan.md) remain inputs to a separate measured comparison. This decision establishes no renderer-performance gain and selects no replacement library. Routes, storage and preset interchange remain compatible.
