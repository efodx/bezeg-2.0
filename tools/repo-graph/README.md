# Local repository graph

This developer-only prototype implements deterministic extraction, bounded local enrichment, caches and model-free reading packets. Retrieval quality remains **partially accepted**; do not depend on it to find every applicable constraint. See the [spec](../../docs/specs/repository-concept-graph.md), [task status](../../docs/tasks/repository-concept-graph/README.md), and [pilot evidence](../../docs/research/repository-concept-graph-pilot-2026-10-25.md).

Requires the repository's installed Node/TypeScript dependencies and Git. From the repository root:

```sh
just graph-build
just graph-status
just graph-enrich --path src/graphs/base/SceneStore.ts --model gpt-6-luna
just graph-query "synchronous lesson scene actions" --max-chars 8000 --max-bytes 32000 --max-results 12
just graph-query "chordKnots" --mode lexical
node --test tools/repo-graph/*.test.cjs
node tools/repo-graph/evaluate.cjs
```

Equivalent commands without just are `node tools/repo-graph/cli.cjs build|status|enrich|query ...`. Quote the task as a single argument. A query refuses stale snapshots; rebuild after source changes or commits. `status` reports stale data without refreshing it. Build/status/query/planning work without Codex or account access. Semantic queries require validated current annotations and perform no inference.

Enrichment defaults to a dry run. Only add `--execute` after selecting the source payload and hosted destination explicitly; `--model` and an explicit `--path`, `--node` or `--passage` scope are required. Repeat these options to select several inputs. Passage IDs are node IDs followed by `@startLine-endLine`, as reported by the dry plan. Each run allows at most four sequential calls, 18,000 supplied bytes/call, 60 seconds/call and 240 seconds/run, with zero retries. Lower limits with `--max-calls`, `--input-bytes`, `--timeout-ms`, and `--elapsed-ms`. No-change reruns make zero model calls. A failed or limited run preserves current cached analysis and resumable pending jobs with reasons, including requests paused in another scope; switching scopes never executes those requests implicitly. Invocation attempts, confirmed calls, unknown calls and provider usage are reported separately; auth failure is not a model call.

`graph-build` resets live semantic annotations while retaining the analysis cache. To reassemble matching cached annotations after rebuilding, use `graph-enrich --execute --max-calls 0 --model gpt-6-luna --path source`; this makes no calls and does not require account access. It removes deleted or changed evidence and remaps current ranges. Normal queries never rebuild or run inference implicitly. Repository-wide model processing remains gated on semantic quality, despite the explicit per-run limit.

`build` writes `.repo-graph/snapshot.json` atomically after validation and a second source fingerprint check. Artifacts, caches, local pilot responses and reading packets stay in ignored `.repo-graph/`. The manifest inventories tracked and eligible untracked files, including staged/unstaged edits, explicit exclusions, unresolved modules/links/references, extraction/compiler versions, configuration dependencies, revision and actual content fingerprint. Ignored files, dependencies, build outputs, known credential formats, binaries, symlinks and graph tooling/artifacts are excluded. Exclusions are coverage limits, not a complete secret scanner; review selected passages before explicitly authorizing hosted processing.

The installed compiler and effective `tsconfig.json` determine declaration/reference coverage. Files outside that program remain inventoried as file-only passages; structural completeness reports this explicitly. Markdown extracts ATX sections, local inline/reference links, and explicit status markers. Setext headings, HTML links, dynamic imports/behavior and mathematical equivalence are not inferred. Glossary terms seed explicit mention edges. Static references do not establish that a test tests a particular behavior.

Snapshot identity is path + declaration/heading identity + duplicate ordinal. Line numbers and content hashes are rebuilt each time. Analysis cache identity is separate: exact supplied text, prompt/schema, model and settings; unchanged content can be remapped to current IDs, with its supporting quotes revalidated. The pilot cache is not live graph enrichment. Deleted sources are absent from rebuilt snapshots.

Reading packets include revision, source fingerprint, extraction coverage, ranges, content hashes, excerpts, and lexical/structural/inferred connection explanations. Small source nodes (up to 4,000 characters) stay whole to preserve their contract; larger nodes use declared groups of up to 12 lines. Whole passages are omitted to fit both character and UTF-8 byte limits. Estimated tokens are heuristic. Similarity and concept memberships do not establish shared responsibility or override documentation authority. Verify passages and direct sources before editing; the graph cannot establish that every applicable constraint was found.

Enrichment seeds a bounded vocabulary from the glossary, retains exact aliases, and keeps mathematical concepts separate from implementation responsibilities. Independent tags propose a bounded concept-overlap candidate review; structural and lexical candidates supplement it. Cache identity includes actual supplied text, selected model, schema/prompt/settings and actual vocabulary/context; no cached location is authoritative. Cache-only reconstruction validates provenance and exact current evidence. Pair-cache recovery scans at most 2,048 records and reports any omitted records explicitly. Partial semantic status includes a coverage denominator; complete analysis of one selected scope does not mean repository-wide completeness.

The current adapter (`pilot-6-evidence-ids`) supplies enumerated source IDs and up to 16 exact evidence fragments per source. The model selects IDs; the caller decodes them to current source text and validates both relationship endpoints. This prevents fabricated quote whitespace and unsupported IDs, but does not establish semantic truth. The pilot still produced an unsupported contrast and irrelevant concept matches. Reading packets remain experimental; the observed retrieval gate failed. Evaluation checks anchor text inside the actual selected excerpt as well as its path and line range.

## Explicit hosted pilot

The pilot uses saved `codex login` **ChatGPT** authentication, never an API-key fallback. Local invocation still sends selected source to hosted inference. No model command runs in CI, on builds/queries, through hooks, or automatically. Account state, model availability, latency and usage must be measured, not inferred from a configured model name.

```sh
node tools/repo-graph/pilot.cjs plan scene-store-sync iteration-adr geom-chord-knots geom-spline-consumer
# Only after explicitly approving this payload, hosted destination, and call budget:
node tools/repo-graph/pilot.cjs run scene-store-sync iteration-adr geom-chord-knots geom-spline-consumer
```

The frozen cases and corpus are in `fixtures/`. `plan` performs no model calls. Each `run` has at most four independent tagging calls plus one candidate review, 18,000 supplied bytes per call, one concurrent call, 60 seconds per call, and zero retries. Cache hits make no call. Partial results retain pending jobs; a rerun resumes successes. `repeat` forces the first tagging call, `edit`/`multi-edit` alter supplied copies only; they require their own call budget. `repair-pilot.cjs` records the fixed five-job second experiment and resumes recorded jobs, including rejected jobs, without silently retrying them. Removing its local report permits new spending and requires a new budget decision.

The invocation ignores user config/project instructions, uses a fresh temporary directory, forces ChatGPT login, disables shell execution, apps, browser/computer tools, plugins, multi-agent tools, hooks, memories, image and web tools, and rejects any unexpected tool event. A synthetic live probe attempted to redirect the model to a generated non-secret sentinel; no tool event or sentinel contents appeared. This is bounded evidence, not an exhaustive security claim. The installed CLI ignores the official `tools.view_image` spelling, so this adapter uses its supported `features.view_image=false` feature flag. Reported usage may be unknown after startup/timeout failures; failure records retain elapsed time and provider usage received. The invocation deadline includes authentication. Output is schema- and caller-bounded to four tags or three relations. There is no guaranteed total in-flight token cap or subscription-percentage estimate.

No bulk enrichment is authorized by running the deterministic commands. Prompt/schema/context changes invalidate the relevant caches. The [measurement record](../../docs/research/repository-concept-graph-pilot-2026-10-25.md) distinguishes old and current configurations; future CLI changes require new overhead measurements. `hardening-pilot.cjs` runs the explicit four-job changed-copy/isolation experiment and persists rejected jobs rather than silently retrying them.
