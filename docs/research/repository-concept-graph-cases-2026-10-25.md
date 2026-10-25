# Repository concept graph pilot cases

Frozen on 2026-10-25 before semantic-model or retrieval tuning. The cases cover geometry reuse, synchronous lesson scene actions, JSXGraph object disposal, typed localization, preset import validation, lesson math notation, documentation authority, and numerical cache freshness. Four held-out tasks probe precise translation parameters, import-time revalidation, animation authority, and the boundary between shape-preserving geometry and its drawing adapter.

`tools/repo-graph/fixtures/cases.json` contains 12 manually selected tasks: 8 development and 4 held-out. Each mandatory passage and distractor names a repository path plus a unique text or declaration anchor; the reason fields record relevance and why a superficially related responsibility should be excluded. The cases include cross-vocabulary connections and distinguish numeric cache versions from scene-store notification versions, listener cleanup from board-object disposal, translation typing from runtime substitution, and mathematical operations from JSXGraph display construction.

`tools/repo-graph/fixtures/pilot-corpus.json` contains 10 short exact excerpts. Its first four entries are the initial bounded pilot slice: pure chord-knot geometry, its spline consumer, synchronous scene-store semantics, and the accepted lesson-action ADR. The third and fourth passages form a manually useful code-to-document connection: same-tick state visibility enables the accepted repeated-action lesson behavior. The remaining excerpts sample disposal, localization, import validation, notation, guardrails, and accepted hosting direction.

## Source check

Checked every corpus excerpt against the current file lines declared by `startLine` and `endLine`, using LF-joined UTF-8 text. Checked every mandatory, distractor, and connection anchor against its named source file; each occurred exactly once. Recorded SHA-256 values are over the exact UTF-8 `text` field, independent of source-file newline convention. The check passed for all 10 excerpts and all case anchors. The task split is 8 development / 4 held-out.

No model calls, retrieval comparisons, or tuning were performed for this freeze. This record establishes fixture provenance only; it does not claim measured retrieval quality or semantic accuracy.

Maintenance during implementation: the development documentation-authority distractor originally anchored `Proposed commands, not existing commands` in the graph spec. Implementing the commands made that sentence inaccurate. Its anchor first targeted the still-proposed `graph-enrich` command, then the remaining proposed extensions once enrichment was implemented. The task, mandatory passages, 8/4 split and held-out cases are unchanged. This follows the source's actual status change, not a retrieval-result adjustment.
