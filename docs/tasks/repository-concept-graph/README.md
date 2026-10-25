# Repository concept graph tasks

Status: planned; no implementation started. Source and acceptance criteria: [specification](../../specs/repository-concept-graph.md). Execute sequentially until interfaces and evidence are stable. Handlers own scope, review, verification, and Git operations; bounded implementation slices can then be delegated under the repository workflow.

## 1. Freeze evaluation cases and run a local semantic feasibility experiment

Own `tools/repo-graph/fixtures/` and a concise evidence record under `docs/research/`. First select the 12 tasks and expected passages, including held-out cases, without tuning to generated results. Prepare a small representative set of code declarations and document sections, with content IDs. Use the installed Codex CLI and supported saved ChatGPT login to test concept tagging and bounded candidate review with schema-constrained output. Keep execution read-only and validate its output in the calling tool.

Compare a no-model baseline, independent concept tagging, and candidate review. Measure actual usage including context overhead, elapsed time, evidence validity, concept alias consistency, and useful connections missed by the baseline. Include one repeat and one small edit to demonstrate reusable content analysis. Establish supported authentication before model work; stop if only paid API access is available. Do not bulk-enrich the repo or install hooks.

Done when spec criteria 1, 3, and the small-pilot portion of 4 have evidence, limitations are explicit, and the owner has concrete initial/update usage figures on which to judge acceptability. Record the proposed model and limits; do not promise a subscription percentage from token counts.

## 2. Implement deterministic snapshot extraction

Depends on task 1's corpus and output contract; can proceed if semantic quality needs further work. Own graph schema, file inventory, TypeScript extraction, Markdown section/link extraction, glossary seeding, manifest, status, build command, and fixture tests under `tools/repo-graph/`. Keep generated data ignored and application code untouched. Pin compiler behavior to installed TypeScript/configuration. Emit unresolved-reference diagnostics and explicit excluded-format coverage.

Done when repeated builds of identical inputs are deterministic, freshness and dirty-file handling work, deletion/rename/range-shift fixtures pass, and cold build duration and artifact size are measured. Finalize command syntax and document graph identity versus content-cache identity.

## 3. Implement bounded local enrichment and cache

Depends on tasks 1 and 2, and an evidence-backed acceptable usage budget. Own local Codex adapter, extraction schemas, concept aliases, cache, pending queue, dry-run estimates, model usage report, and snapshot validation. Keep model execution out of CI. Use bounded batches and retries, zero calls on no-change reruns, and explicit partial status on failures or exhausted limits. Reuse cached extraction without reusing stale source locations or deleted connections.

Done when spec criteria 4–6 pass for enrichment, a changed chunk only triggers analysis justified by its cache dependencies, malformed output cannot corrupt the graph, and interrupted runs resume. Record any gap in hard token-limit enforcement and actual provider telemetry.

## 4. Deliver useful reading packets and evaluate the complete local tool

Depends on tasks 2 and 3. Own deterministic query/ranking/traversal and packet formatting. Include evidence paths, source excerpts, inferred status, revision, coverage, and strict output limits. Compare all retrieval approaches against task 1's fixed cases, tuning only with the development cases before the held-out run.

Done when spec criteria 2, 3, and 7 pass or remaining failures are explicitly resolved in the spec. Report retrieval quality and end-to-end consumption, including indexing overhead versus reading saved on representative tasks; a smaller packet alone does not establish net token savings. Keep normal queries model-free. Review semantic false positives before introducing agent instructions that depend on this tool.

## 5. Integrate developer workflows and deterministic CI checks

Depends on accepted local tool behavior. Add justified `just` recipes and command documentation, focused Windows/Linux tooling checks, and a credential-free structural build on relevant pushes/PRs. If useful, upload a commit-addressed structural artifact; do not require artifact retention for local operation or tie graph generation to Pages deployment. Document how agents query and verify passages, with any AGENTS.md/skill changes following the relevant writing skills.

Done when spec criterion 8 passes, a clean checkout can rebuild/query documented deterministic inputs, local enrichment still uses only the owner's explicitly selected authentication path, and no scheduled model work or Git hooks were enabled implicitly.

## Later work, only if measurements justify it

Keep structural incremental extraction, embeddings, MCP, visualization, automatic local triggers, and durable semantic distribution in the spec's remaining decisions rather than creating implementation tasks now.
