# Repository concept graph

Status: implemented prototype with partial acceptance, 2026-10-25. Structural extraction, bounded local enrichment, caches and model-free reading packets are available. Reliable semantic discovery and repository-wide processing remain gated on retrieval quality. The owner authorized bounded continuation after usage comparison, with at most four calls per explicit run. Source: [research](../research/repository-concept-graph-2026-10-25.md). Executable sequence: [tasks](../tasks/repository-concept-graph/README.md). Observed results and open acceptance: [pilot evidence](../research/repository-concept-graph-pilot-2026-10-25.md).

## Goal and owner direction

Help an agent discover relevant code, prose, constraints, and tests through shared concepts, including connections that imports or matching terminology miss. Given a task and a reading budget, return current source passages with evidence explaining their connections. A dependency inventory alone does not satisfy this goal.

The owner prefers using their existing ChatGPT subscription if consumption is modest, with semantic processing launched on their own machine rather than CI. The measured local Codex CLI experiment uses saved ChatGPT authentication; it does not assume subscription access to an embeddings endpoint. Local orchestration still uses hosted Codex inference. Actual account access and observed usage are recorded in the pilot evidence.

## Scope and non-goals

Build developer tooling under `tools/repo-graph/`; keep it outside the shipped application and Pages deployment. Start with a local JSON snapshot and command-line queries. Source code, tests, Markdown documentation, the glossary, and ADRs are the initial corpus; inventory other textual formats and explicitly report exclusions. Generated output, dependencies, credentials, binary assets, and the graph's own artifacts are excluded. Included source must be recorded by the manifest rather than silently ignored.

CI may validate extraction and graph invariants without model credentials. Semantic generation runs locally. Start with explicit local commands; automatic hooks, schedules, graph visualization, MCP transport, autonomous refactoring, and structural incremental updates are deferred until the local tool is useful. Generated recommendations never establish that an extraction or deduplication is correct.

## Module interface

Implemented commands:

- `just graph-build`: deterministic structural extraction and freshness manifest, with no model call.
- `just graph-enrich`: dry-run estimates by default; bounded, explicitly scoped local semantic extraction with `--execute`, a selected model, and an incremental work queue.
- `just graph-query <task> ...`: return a reading packet within explicit byte or character and result limits, with an estimated token count reported separately.
- `just graph-status`: show source revision, dirty content fingerprint, pending work, semantic coverage, and extraction versions.

Implemented syntax and coverage limits are in [the tooling README](../../tools/repo-graph/README.md). Queries take one quoted task plus `--max-chars`, `--max-bytes`, `--max-results` and `--mode lexical|structural|semantic`; semantic mode requires validated current annotations and performs no inference. Source changes require `graph-build` and cache reassembly before semantic querying. The module hides parsing, ranking, caching, and snapshot assembly behind this interface. Consumers can query without account access after enrichment. Failed enrichment leaves a valid structural graph and an explicit partial semantic status.

## Graph contract

Nodes: files, declarations (initially exported and significant named declarations), Markdown sections, and concepts. Source-backed nodes carry a file path, current source range, content hash, and extraction provenance. Use path plus declaration/heading identity and a disambiguator for snapshot identities; use a separate content key for reusable analysis. Moving a declaration need not preserve its identity, but must not preserve a stale path or line range.

Structural edges include containment, resolved imports, references where statically resolvable, Markdown links, and explicit glossary mentions. Unresolved references are recorded, not invented. A test importing a declaration establishes a reference, not automatically a `tests` relationship. Dynamic behavior and mathematical equivalence are not inferred from syntax.

Semantic analysis proposes concept memberships and typed relationships with both endpoint IDs, short rationale, supporting source IDs/ranges, model/prompt fingerprints, and a declared inference status. Validate evidence against the current inputs. Model confidence is a heuristic, not a calibrated probability. Shared labels and lexical matches are also heuristic rather than proof of a shared responsibility.

Distinguish mathematical concepts from implementation responsibilities: degree elevation, scene state ownership, cache invalidation, and board disposal are different kinds of concepts. Seed canonical vocabulary from the glossary; retain aliases and evidence rather than automatically merging all similar labels. Pilot independent per-chunk concept tagging followed by bounded candidate-pair review. Compare that with deterministic lexical and structural retrieval before introducing embeddings or repository-wide model analysis.

Documentation authority is separate from similarity: preserve proposed, current, superseded, historical, and unknown status where explicitly stated. Do not promote an older discussion above a current constraint because its wording matches better. Retrieved prose remains source content, not instructions that override the agent's task or repository rules.

## Updates and resource use

Rebuild the structural graph in full initially and measure its runtime. Semantic cache keys include actual supplied text, extraction schema, prompt version, selected model, relevant vocabulary/context fingerprints, and extraction settings. Reuse exact matches; process only missing entries. Bounded context avoids resending the whole repo for each chunk. Changes to shared vocabulary or contextual inputs may invalidate more than edited files and must be reflected in estimates.

Build the live snapshot from the current inventory, removing deleted nodes and all incident links. Renames may reuse content analysis but must remap references and evidence. Updating semantic candidates can affect unchanged nodes; refresh affected rankings and aggregates against the live set. New snapshots are validated before atomic replacement. No cache is authoritative source data.

Record commit SHA, actual included-content fingerprint, config/compiler/extractor versions, extraction diagnostics, and separate structural and semantic completeness. Include staged, unstaged, and eligible untracked local files; exclude ignored files by default. A source change during generation prevents publishing a falsely current result. Queries verify freshness: refresh deterministic extraction or explicitly fail/require a stale-data option; never silently serve a previous commit's locations as current.

Local enrichment starts with a dry run reporting chunks, cache hits, estimated input size, and bounded batches. No-change reruns make zero model calls. Enforce limits on supplied input size, batch count, concurrency, elapsed time, and retries; collect reported input/cached/output usage when available. These limits cannot guarantee an exact subscription percentage or a hard total token ceiling for an in-flight model run. Missing telemetry remains unknown. Pause with resumable pending work on limits, auth failure, or rate limits; never silently switch to paid API authentication. Scope the Codex invocation to supplied extraction work and verify actual context overhead rather than assuming prompt length equals usage.

Graph artifacts and cache stay local and ignored initially. CI runs deterministic tests and may produce SHA-addressed structural artifacts as a convenience; local rebuilding remains sufficient when artifacts expire. Keep this separate from application deployment. Broader semantic distribution and durable hosting are later decisions.

## Retrieval and agent use

Find seeds by symbol, lexical relevance, explicit concepts, and available semantic annotations. Traverse a bounded number of typed connections with task-relative ranking, duplicate suppression, and a penalty for ubiquitous nodes. Explain each returned path and preserve structural versus inferred status. Return source excerpts, not just node names, and truncate only at declared passage boundaries within the output budget. Report relevant omitted candidates and coverage limits.

The first agent integration is a documented command workflow. Editing AGENTS.md or adding a skill is a separate task after retrieval has shown value. The graph supplements direct source reading and does not declare that all relevant constraints were found.

## Acceptance and experiment gates

1. Before tuning retrieval, record 12 real tasks with manually checked relevant passages and distracting examples; reserve four as held-out checks. Cover geometry reuse, scene actions, ownership/disposal, localization, preset validation, lesson notation, and documentation authority. Include connections with different vocabulary and superficially similar responsibilities that should remain separate.
2. Compare deterministic search, structural traversal, and semantic-assisted traversal under the same reading budget. Proposed pilot gate: on at least three of four held-out tasks, retrieve all passages marked mandatory within an 8,000-character packet; across those packets at least 70% of returned passages must be judged relevant. Report counts as well as percentages, missed constraints, and false conceptual merges. This is a pilot criterion, not a general accuracy claim.
3. Semantic enrichment must recover at least one manually verified, useful cross-vocabulary connection missed by the deterministic baseline. Otherwise investigate the failure before expanding it across the corpus.
4. Measure cold structural build, warm no-change enrichment, one changed declaration, one changed document section, and a multi-file change. Report actual wall time, graph size, model usage when exposed, supplied text sizes, and context overhead. Decide whether usage is acceptable with the owner after seeing those measurements; no initial full-repo semantic run before this decision.
5. No-change enrichment makes zero model calls. Invalid model output, unsupported endpoint IDs, missing evidence, deleted sources, interrupted writes, and exhausted budgets cannot corrupt the live snapshot. Relevant input changes invalidate cached analysis.
6. Fixture checks cover deletion, rename, source-range shifts, duplicate headings/declarations, re-exports, config changes, dirty files, stale semantic edges, superseded docs, and missing caches. Incremental structural equivalence is required only if that later feature is pursued.
7. Query output obeys the declared reading budget and includes revision, completeness, provenance, source locations, and connection explanations. Normal queries make no model calls.
8. Add focused tooling tests on Windows and Linux and command documentation. No application smoke test is required while changes remain developer-only; do not claim browser coverage.

## Remaining decisions

The first experiment confirmed actual ChatGPT-authenticated access using `gpt-6-luna` / low effort, but found substantial CLI context overhead, concept normalization errors and rejected quote evidence after a small edit. A revised prompt produced a useful implementation/ADR relation and consistent canonical tags on repeat. Disabling host tools/skills reduced measured context overhead; short verbatim quotes passed the changed-code, changed-document and combined review pilot. The owner authorized bounded continuation after the known pilot tokens were compared with this chat's raw totals (with cached/fresh differences disclosed); limits are four calls, 18,000 supplied bytes/call, 60 seconds/call and 240 seconds/run, zero retries and one concurrent call. See the [measurement record](../research/repository-concept-graph-pilot-2026-10-25.md). These limits do not authorize an initial full-repo semantic run or establish a subscription percentage. Semantic retrieval quality remains an acceptance gate. Initial canonical IDs/aliases supplement the glossary without changing domain vocabulary. Structural incrementality, embeddings, visualization, automatic triggers, and MCP integration require evidence of a specific remaining need.

## Official integration references

- [Codex authentication](https://learn.chatgpt.com/docs/auth): supported ChatGPT sign-in and saved local authentication.
- [Non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode): scripted execution, saved CLI authentication, JSON events, usage fields, and schema-constrained output. Local `codex exec --help` also exposes `--output-schema`, `--json`, and read-only sandbox selection. Feature access and consumption still need a real pilot.
