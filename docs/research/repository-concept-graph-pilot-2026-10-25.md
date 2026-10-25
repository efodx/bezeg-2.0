# Repository graph: initial implementation and semantic pilot

Date: 2026-10-25. Source: [spec](../specs/repository-concept-graph.md). This records partial acceptance, not completion of the five-task sequence.

## Frozen inputs and authentication

The [case-selection record](repository-concept-graph-cases-2026-10-25.md) freezes 12 manually checked tasks (8 development / 4 held-out), mandatory anchors, distractors and 10 content-addressed excerpts before model work or retrieval tuning. Initial model inputs were `scene-store-sync`, `iteration-adr`, `geom-chord-knots`, and `geom-spline-consumer`; the repair experiment used the first two plus an edited copy. Original source files were not edited for the experiment.

Installed CLI: `codex-cli 0.163.0-alpha.10.2`; `codex login status` reported `Logged in using ChatGPT`. A read-only no-source probe completed with selected `gpt-6-luna`, effort `low`: 15,852 input tokens (11,776 cached), 9 output tokens. This is a probe, not enrichment cost. The sandbox could not initialize the CLI runtime; hosted pilot commands needed elevated local execution. Automatic approval initially rejected source transfer; the owner explicitly approved the four excerpts/five calls, then five repair/test calls. There was no paid-API fallback.

The [official non-interactive documentation](https://learn.chatgpt.com/docs/non-interactive-mode) and installed CLI help establish JSON events, schema output and saved authentication; actual account access was established by completed calls. Local execution still used hosted inference. Later tool-disabling settings follow the [official configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference).

## Measured model consumption

All numbers below are scoped to the pilot child CLI calls, not handler/worker usage. Cached tokens are included in provider input totals. Supplied-token and overhead values are estimates based on characters / 4; provider input/output totals are reported telemetry.

| Experiment | Calls | Reported input | Reported output | Child inference wall time |
| --- | ---: | ---: | ---: | ---: |
| Original tagging (`pilot-1`) | 4 | 59,506 | 692 | 18.950 s total |
| Original candidate review | 1 | unknown | unknown | unknown |
| Repair/test (`pilot-2`), including rejected copy edit | 5 | 75,752 | 731 | 24.571 s total |
| Warm two-passage cache replay | 0 | 0 | 0 | 2 ms |

Nine semantic calls have reported totals of 135,258 input / 1,423 output tokens; the tenth semantic call is unknown. Add the separate authentication probe only when comparing the experiment's wider setup cost. Timing above excludes per-call login checks and handler/worker orchestration, so it does not establish end-to-end savings.

Original tagging supplied 977–1,761 bytes per call; repair calls supplied 1,404–2,442 bytes. Recorded input was approximately 14,400–15,000 tokens beyond the character-based supplied-text estimate per call. The changed-copy call reported 14,080 cached input tokens; the other repair calls reported zero cached input. Subscription percentage, remaining plan allowance, and future per-call overhead cannot be derived from these figures. No full-repository enrichment has run. At this overhead, independent analysis of thousands of declarations would be expensive; any extrapolation is a planning estimate, not measured consumption.

Local raw responses/usage remain in ignored `.repo-graph/pilot/`. Successful extraction records include prompt/schema fingerprints, requested model, exact quote evidence and source IDs. A cache-key change reanalyzes only the justified dependency; source IDs are remapped and evidence checked before reuse. Tests cover rename/remapping, no-change zero calls, changed text invalidation and corrupt caches. This is a pilot cache, not the resumable live enrichment engine required by task 3.

## Quality findings and disposition

Original independent tagging used different IDs for the same intended concept (`chord-length-parameterization` versus `chord-knot-parameterization`; scene-related aliases differed too). It classified immediate software state updates and snapshot versions as mathematical concepts. The original candidate call failed evidence validation; its raw response/usage was not retained by that adapter version. No invalid result entered a live snapshot.

The revised prompt supplied canonical examples and explicitly classified software updates/actions/versions as implementation responsibilities. Code and ADR independently produced `synchronous-scene-updates` with the correct responsibility kind. The forced repeat retained the two same canonical IDs, although rationale/quotes changed. Candidate review produced a valid `supports` relation:

- Code evidence: same-tick scene actions read earlier writes (`SceneStore.ts` excerpt).
- ADR evidence: repeating `next-step` uses the same transition as playback, and each step sees earlier state.

Manual inspection confirms this implementation-to-decision connection is useful and its two quotes occur exactly in their frozen inputs. It is **not yet proof of a cross-vocabulary connection missed by deterministic retrieval**: both sources mention synchronous scenes. Criterion 3 remains unmet until a genuinely eligible case is compared with baseline retrieval under the same budget.

The copy-only edit failed evidence validation because the model joined a wrapped source comment into one line. Rejection is correct: fabricated whitespace does not establish an exact source quote. Its usage and rejected output were retained in `repair.json`, status `partial`; the last successful cached result remains usable. A further remedy (for example source-provided evidence IDs plus checked spans) needs a separately bounded experiment, not relaxed quote validation.

Review also found that post-hoc tool-event rejection alone did not prevent a model from reading files first. The adapter now disables command execution and other tool integrations at invocation as well as using a read-only sandbox and rejecting unexpected events. At this initial checkpoint, a live adversarial isolation test and post-change overhead remained gaps; the continuation below records later evidence. Failure paths retain elapsed time and provider telemetry when received; unknown usage stays unknown.

## Structural tooling and retrieval baseline

Structural extraction is implemented independently of semantic success: current source/config fingerprints, deterministic snapshots, TypeScript declarations/imports/references/re-exports, Markdown sections/local links, glossary mentions, exclusions, diagnostics, authority markers, and validated atomic publication. Cold extraction on the initially dirty checkout took 16.9–17.9 seconds, with 15,138 nodes / 47,772 edges, 760 included files, roughly 73 MB compact or 76 MB formatted JSON. These are initial measurements before review fixes and include unrelated owner lesson edits and untracked review material; they are not clean-checkout release figures.

The initial structural coverage was explicitly partial: 408 compiler-program files and 57 file-only code files; other text formats remain file passages. Review strengthened a previously vacuous import-reference assertion to require the consumer-to-imported-function edge; it failed on the old code, then passed with alias resolution. Review also identified inclusive-end-range, local-link syntax, symlink, unresolved-reference and locale-ordering issues; these are fixed in the structural regression suite. Windows symlink creation may require privileges; a skip is a coverage gap, not a pass.

Lexical and structural retrieval are experimental baselines; normal queries make no model calls and refuse stale source. Semantic query mode explicitly fails until accepted enrichment exists. Held-out packets require manual relevance judgments; mandatory-anchor coverage alone cannot establish the 70% precision gate or false-merge rate. The evaluation script writes packet files and conservative anchor-coverage counts to ignored `.repo-graph/evaluation/`; it does not claim manual relevance or semantic results. No held-out tuning is authorized by this first measurement.

Reviewed dirty-checkout structural build: 109.100 seconds, 78,800,735 formatted JSON bytes, 15,147 nodes, 53,164 edges, 762 included files, 216 exclusions and 8,015 diagnostics. Coverage remained 408 compiler files / 57 file-only code files. The higher diagnostic count now includes unresolved identifiers and external-reference coverage instead of silently dropping these. These figures include the checkout's unrelated review HTML; no size/performance acceptance threshold is claimed.

First complete baseline evaluation used query implementation SHA-256 `a1963a42f93688e142111599f1b700740d049e64556979e6601ea31585b56573` and the frozen held-out set. Both lexical and structural modes retrieved all mandatory anchors on **1/4 tasks (25%)**, with **3/8 mandatory anchors (37.5%)** across those tasks. Largest held-out packets were 7,937 and 7,940 characters respectively. Import write-boundary retrieval passed; localization parameters, animation authority and mathematical construction boundaries missed required passages. This fails the proposed 3/4 pilot gate. Manual precision and semantic-assisted results were not measured; there is no net token-savings claim. Query tokenization and target-passage lookup were cached before this first complete held-out evaluation to remove repeated computation; ranking was not tuned to held-out results. Warm held-out lexical/structural queries took approximately 66–122 ms in-process, excluding snapshot loading/validation and the first index construction.

## Acceptance at the initial ten-call checkpoint

Task 1 is partial: corpus/authentication, original/repair consumption, repeat, warm cache and one rejected code-copy edit are measured. Changed-document and multi-file experiments, robust changed-copy evidence, deterministic-missed semantic recovery, and the owner's acceptable initial/update budget remain open. Task 2 can be accepted separately after structural tests and review. Tasks 3–5 remain gated; no bulk enrichment, `graph-enrich` command, semantic packets, automatic trigger, agent instruction change or model-backed CI has been introduced. Only the structural command documentation and credential-free tests are integrated early for reproducibility.

No application code, routes, geometry behavior, stored presets or localization were changed by this work. Application/browser smoke is not required for this developer-only change and was not run.

## Bounded continuation and final disposition

The preceding sections describe the initial ten-call checkpoint. Subsequent owner authorization allowed bounded continuation after comparing usage with this chat. At the comparison checkpoint the root chat reported 8,991,876 raw total tokens (8,948,271 input, including 8,768,768 cached; 43,605 output). The then-known pilot total of 136,681 was approximately 1.5% of that raw count. This was **not a subscription/quota percentage**: root fresh input was 179,503, while pilot fresh input was 121,178. The owner permitted proceeding if the raw share was small. The handler continued with at most four calls per explicit run; no repository-wide inference was performed.

Further measured runs (provider input includes cached input):

| Run | Calls | Input | Output | Outcome |
| --- | ---: | ---: | ---: | --- |
| First tool-isolation configuration | 4 | 44,437 | 470 | Rejected benign CLI error events; telemetry retained |
| Two synthetic configuration probes | 2 | 21,842 | 130 | Identified ignored image-tool config and unstable-feature warnings |
| Corrected isolation / edited copies (`pilot-5`) | 4 | 43,849 | 458 | All four jobs valid; combined inference 15.074 s; warm replay zero calls |
| Live engine with string evidence | 3 + 1 | 49,854 | 553 | Tags valid; two candidate attempts rejected endpoint/quote evidence |
| Enumerated evidence (`pilot-6`) two-file scope | 3 | 38,729 | 322 | Valid tags and supported implementation/ADR relationship |
| Four development batches, four calls each | 16 | 194,022 | 1,756 | Scoped tag work retained; three pair jobs paused at call limit |
| Combined development candidate review | 1 | 13,685 | 17 | Valid empty relationship result |
| Three explicit one-call pair resumptions | 3 | 40,325 | 293 | Completed remaining candidate jobs; 40.913 s end-to-end combined |

Together with the initial reported calls, known semantic/configuration usage is **582,001 input and 5,422 output tokens across 46 reported calls**, plus one original candidate call with unknown usage. The separate authentication probe adds 15,852 input / 9 output; handler and implementation/review workers are excluded. These are cumulative experiment costs, not the cost of one normal run. Corrected adapter overhead was about 10,500 tokens/call before supplied text; four development calls reported about 48,000–50,000 input tokens per batch. No net context or subscription savings have been demonstrated.

The changed-code experiment appended a comment to a copied SceneStore excerpt; the changed-document experiment appended prose to a copied ADR section. Both and the combined pair passed exact evidence validation in `pilot-5`, and all four successful hardening jobs replayed with zero calls. These are copy-only edit measurements, **not a measured edit to a declaration body in the final live engine**. Fixture tests cover body edits and relevant cache invalidation; complete end-to-end update-cost acceptance remains open. No application source was changed for these experiments.

The final adapter supplies enumerated source and evidence IDs, then decodes selected fragments and validates exact current text/ranges. It rejects unsupported endpoints, malformed output and unexpected tool events before publication. User/project config and host skills/tools are disabled. The corrected synthetic sentinel probe produced neither a tool event nor sentinel contents. This is bounded observed isolation, not an exhaustive guarantee. Authentication remains saved ChatGPT only with no paid API fallback.

### Current extraction and retrieval evidence

A clean release worktree based on `da1617f675ccbef2cda4918e006fa786c6f7bba5` measured a structural-v3 build at 49.163 s / 79,650,210 JSON bytes: 15,147 nodes, 53,162 edges, 761 included files, 220 exclusions and 8,015 diagnostics. Compiler coverage is 408 files plus 57 file-only code files. Windows disk/fixture contention varied runtime substantially; these figures do not establish a performance ceiling. Graph artifacts are ignored and are not shipped to Pages.

Development enrichment selected 16 fixed mandatory passages from the eight development cases, in bounded scopes, plus the original pilot sources. Final coverage was 22/32,938 current chunks, 16 concepts and 56 semantic edges. No held-out passages were selected as extra model inputs. Candidate pairs include concept overlap, structural references and lexical fallback; a successful evidence check does not establish that a relation is meaningful.

The final diagnostic probe retrieved all mandatory passages for **2/4 held-out tasks**, versus **0/4** for lexical and structural baselines at the same 8,000-character budget. Semantic retrieval recovered 4/8 required anchors; baselines recovered 2/8. Import write-boundary and animation-authority tasks passed; localization parameter typing and mathematical construction boundaries failed. The original 1/4 baseline above used a different passage/ranking version. Repeated diagnostic summaries were visible during development; these four cases are no longer a pristine blind hold-out. Acceptance needs a new untouched set after development is frozen, even if this reused set eventually passes.

Manual relevance judgments on the four final semantic packets use a conservative rule: a passage must directly help answer the task or supply an applicable constraint, rather than merely mention its broad topic.

| Diagnostic case | Relevant / returned | Judgment |
| --- | ---: | --- |
| Localization parameter | 0/5 | Preset-name validation and general guardrails did not provide the parameter contract |
| Import write boundary | 3/6 | Guardrail plus preflight/commit declarations relevant; localization passages and generic typecheck note irrelevant |
| Animation authority | 2/3 | ADR and SceneStore relevant; architecture process/check instructions irrelevant |
| Math construction boundary | 4/7 | Mathematical guardrail, elevation shape criterion, capability table and numerical-verification contract relevant; chapter exclusions, lesson availability ADR and unchanged-prose review irrelevant |
| Total | **9/21 (42.9%)** | Below the 70% gate |

An inferred `contrasts` edge connected geometry independence with browser-language detection, even though its rationale said the passages did not establish a direct contrast. Exact quote validation correctly verifies location, but cannot verify this semantic claim. Preset-name concepts also pulled a translation-parameter query toward the wrong responsibility. These are concrete false connections; do not treat an inferred edge as an applicable instruction or proof of shared responsibility. No manually verified cross-vocabulary recovery beyond deterministic terminology has been established (criterion 3 remains open).

### Delivered scope and open acceptance

Structural extraction, provenance/freshness validation, explicit scoped enrichment, content caches, resumable pending work, bounded model-free packets, four commands, documentation and credential-free CI are implemented. Tests exercise cache reuse/remapping, deletion/range/config changes, malformed provenance, unsupported evidence, budget exhaustion, scope switches and packet bounds. Partial completion of a selected scope remains globally partial.

The semantic expansion gate fails both mandatory coverage and manual relevance. Repository-wide inference, automatic triggers and agent instructions depending on graph retrieval remain blocked. Tasks 1 and 4 retain open quality/economics criteria; task 3 lacks final live body-edit cost measurements and an exact in-flight token cap (the provider does not offer one here). Task 5 supplies a workflow but cross-platform success must be established by its actual CI run. This is a delivered experimental implementation with partial acceptance, not an accepted replacement for repository search or direct reading.

Final pre-commit verification used query SHA-256 `f40e65dc29b983fdbda3f9c2939a991b79ba8d32c1530b33522316a69595e523`. Anchor checks require actual excerpt text, not only overlapping line numbers. Maximum held-out packet lengths were 7,936 lexical, 7,937 structural and 7,935 semantic characters. The final documentation-inclusive build measured 21.442 s / 79,681,340 bytes, 15,150 nodes / 53,166 edges, 761 files. Cache-only replay over the 16 selected development passages took 7.234 s end-to-end, **zero invocation attempts and zero tokens**, retaining 22/32,952 chunks and 56 edges with no pending scoped jobs. The denominator changes when included documents change. Focused graph tests: 42 passed, one Windows symlink test skipped (`EPERM`); command-runner tests passed. Application/browser smoke was not required and was not run.

Release integration rebased without conflicts onto `359648d` after master added correctness lint and other unrelated work. Clean locked dependencies were installed only in the isolated worktree. Nine new lint findings were repaired without behavior changes; generated `.repo-graph/` state is excluded from lint. Full repository lint passed (12.6 s), graph fixtures passed again (42 plus one Windows symlink skip), and command-runner fixtures passed against the rebased source. Model-free rebuild/query/dry planning succeeded; the rebased build took 20.676 s / 79,959,224 bytes, with 15,208 nodes, 53,258 edges, 774 files and 8,018 diagnostics. Earlier pilot quality figures remain scoped to their recorded revision; no new inference was run after the failed quality gate.
