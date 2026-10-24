# Justfile opportunities from past Bezeg sessions

Research, 2026-10-16. Scope: identify useful command contracts; this report does not install `just`, add recipes, or change verification requirements.

## Recommendation

Introduce a small justfile around repeated verification and preview workflows. The strongest opportunity is to stop agents reconstructing shell commands, environment variables, logging, and process ownership. Short aliases alone offer modest savings. A concise result with a retained full log can save substantially more context than shortening `npm run build`.

Keep the existing npm scripts authoritative. Put substantial cross-platform orchestration in Node helpers, with `just` providing discoverable names and parameters. This is an implementation proposal, not a measured token-saving result.

## Evidence and limits

Reviewed local Codex session files under `~/.codex/sessions/2026/10/{14,15,16}`, filtered by session metadata whose working directory contains `bezeg`, excluding this investigation. The sample contains 113 session records: 41 parent records and 72 worker records. Of these, 69 expose completed command records, totaling 1,613 distinct command IDs. These are sessions created in the selected date directories, not necessarily all commands executed within those dates. A session record is not necessarily an independent task.

For discovery, matched command text in completed `CommandExecution` records, deduplicating by command ID within each session. Counts below are **candidate command records containing a pattern**, not exact program execution counts: a shell batch can contain several invocations, and commands writing documentation can mention commands without running them. Categories overlap. Representative examples below were separately inspected. This sample excludes Claude histories, browser-only actions, inaccessible/missing logs, and sessions outside those directories. It is not an exhaustive history of the project.

| Candidate pattern | Command records | Session records |
| --- | ---: | ---: |
| TypeScript `tsc --noEmit` | 24 | 10 |
| Unit runner (`npm test` or `vitest`) | 29 | 13 |
| `npm run build` | 29 | 10 |
| Smoke runner (`test:smoke` or `playwright test`) | 37 | 7 |
| Preview/start-process commands | 17 | 10 |
| Port/process inspection or termination | 10 | 7 |
| Preview capture/generation tooling | 6 | 3 |
| Git fetch/rebase/push | 115 | 27 |

No tokenizer-based counterfactual, cost comparison, or causal estimate was performed. Counts establish recurrence, not avoidable work. Retrying after a genuine fix, rebuilding after source changes, and rechecking after rebasing remain necessary.

## Where just would have helped

### 1. Named verification bundles and non-watching unit tests — highest priority

In **“Smooth carousel image transitions”** (`01a14482-9647-7250-802b-31e3b5975e7b`), the handler separately ran TypeScript, the focused `WelcomePage.test.tsx` test, and the production build, then checked again after integration. **“Prevent demonstration image flashes”** (`01a1448d-1136-7742-bf8f-c8aa4c71ce69`) similarly combined TypeScript, three focused component tests, and builds. **“Implement demonstrations library”** (`01a14072-50b5-70b3-ad08-c0eec97aa35a`) used both `npx vitest run` and focused variants.

Proposed interface:

- `just check`: TypeScript, all unit tests once, then production build; stop on the first failure.
- `just unit [files...]`: unit tests once, optionally focused.
- `just check-localization`: TypeScript plus production build, matching the repository's explicit localization rule.

The benefit is a stable contract for agents and handoffs. `package.json` currently defines `test` as `vitest`, so an unattended recipe must explicitly select run mode. A focused unit run does not become full verification by acquiring a recipe name. Choose bundles according to affected behavior; documentation-only work does not need app checks. See [package scripts](../../package.json), [CI](../../.github/workflows/browser-smoke.yml), and [AGENTS.md](../../AGENTS.md).

### 2. Parameterized production smoke runs — highest priority

In **“Fix demo preview lazy loading”** (`01a144a6-aebc-7ac0-93a7-a62fe69e26b8`), a reproduction command was:

```powershell
$env:SMOKE_PORT='4186'; npm run test:smoke:built -- tests/home.smoke.spec.cjs tests/demonstrations.smoke.spec.cjs --grep 'catalogue shows|homepage owns|homepage fits' --workers=1
```

This was followed by a complete run of the two affected files. Workers belonging to **“Implement demonstrations library”** also reconstructed file lists, grep expressions, worker counts, ports, and reporter options. Worker `01a14073-a502-7953-8d71-63a0c5ebe063` used repeated lesson filtering and port inspection; worker `01a14074-351b-74e0-9206-35400db72cc7` repeatedly ran the catalogue/picker/ownership subset.

Proposed interface:

- `just smoke [Playwright arguments...]`: build once, then run selected production smoke coverage.
- `just smoke-built [Playwright arguments...]`: reuse a known current build and report its provenance.
- Accept a port override without requiring agents to reconstruct PowerShell environment syntax. Retain arbitrary file/grep arguments; add named subsets only when their membership is stable and owned.

The existing npm scripts already provide both build-and-test and built-only execution. Just's additional value must come from consistent parameters, provenance, and output handling. Playwright already launches and disposes its own server; a smoke recipe must not start another preview first. Preserve occupied-port failure and `reuseExistingServer: false`. Automated coverage still does not replace change-specific manual interaction checks. Sources: [Playwright config](../../playwright.config.cjs), [smoke guidance](../smoke-tests.md), and [the historical repair results](../reviews/interface-implementation-history.md#preview-panel-and-smoke-corrections).

### 3. Compact output with complete failure evidence — highest priority alongside recipes

The carousel session returned 11,852 and 11,569 characters from successful build command records. The isolated build in the CI repair session returned 13,325 characters, including its setup command. In the library worker record `01a14074-351b-74e0-9206-35400db72cc7`, failed smoke command records returned approximately 15–64 KB of output. These are recorded output character lengths, not model token counts.

A shared command helper should retain complete output in ignored, per-run logs and print a short success result: command, exit status, duration, tested scope, revision/dirty state, and log path. On failure, return the relevant diagnostic excerpt and log path, preserving the original nonzero exit status. Provide an explicit verbose mode. Keep warnings discoverable and report new material warnings; do not turn truncation into a false pass.

`just --quiet` or `@` suppresses command echo, not compiler/test output. Output reduction therefore requires runner configuration or a helper; adding `just` alone will not deliver this benefit. Do not hard-code suppression of all stderr. See the official [quiet-recipes documentation](https://just.systems/man/en/quiet-recipes.html).

### 4. Owned preview lifecycle and a setup diagnostic — second priority

**“Update header styling”** (`01a140f4-5fea-72c3-ab6b-75eb142aeda3`) included failed builds, dependency resolution diagnostics, and a preview command using `SMOKE_PORT=4187`. The catalogue-loading session inspected server setup, and worker records repeatedly inspected listening ports and processes.

Proposed interface:

- `just preview <port>`: serve the production build in the foreground, printing its URL, checkout, and build provenance for browser handoff.
- `just doctor`: report Node/npm/just availability, required dependency resolution, build presence, and requested-port ownership. Report actionable failures rather than changing dependencies automatically.
- If background preview management proves necessary, add a helper that records its own PID and checkout, checks readiness, and stops only the process it owns.

A recipe would have shortened setup and made ownership clearer. It would not itself repair missing dependencies, sandbox restrictions, or concurrent writes to shared dependencies. Do not automatically kill all Node processes, reuse an arbitrary listener, or run `npm ci` in shared linked dependencies. Sources: [server](../../scripts/serve-smoke-build.cjs), [browser handoff requirements](../agent-workflow.md), and [smoke setup](../smoke-tests.md).

### 5. Read-only Git status and CI lookup — second priority

The CI repair session reconstructed a `gh run list` query with repository, workflow, commit SHA, result fields, and limit. Many sessions separately checked branch, dirty state, and divergence before integration.

Proposed interface: `just status` for branch/dirty state/divergence against the currently fetched ref, and `just ci <sha>` for a compact workflow lookup. State when a ref has not been freshly fetched. Keep commit selection, conflict resolution, rebase review, and deployment decisions with the handler. The 115 Git-pattern records do not justify hiding those decisions in a generic `just ship` command. Repository policy requires fetching, rebasing only task commits, rechecking, and a fast-forward push to `origin/master`; any later automation needs its own bounded specification. Source: [Git workflow](../../AGENTS.md).

### 6. Preview asset capture — later

**“Improve demonstration previews”** (`01a14470-b056-7213-a298-04df6fefaf12`) and **“Plan animated graph previews”** (`01a144e0-4ecf-7510-afa6-4b388db80b73`) inspected capture/generation tooling. This is weaker execution evidence: the pattern counts include discovery reads.

A later `just capture-previews <base-url>` could validate the supplied production origin, run the existing capture script, and report changed assets/provenance. The script currently reads `PREVIEW_BASE_URL`, defaults to port 3012, and writes catalogue assets. Keep capture an explicit mutating operation outside ordinary checks. Sources: [capture script](../../scripts/capture-demonstration-previews.cjs), [generation script](../../scripts/generate-demonstration-previews.cjs).

## Implementation boundary and pilot

Start with `check`, `unit`, `check-localization`, `smoke`, `smoke-built`, and the shared log helper. Add preview ownership and diagnostics next. Keep a short, stable AGENTS.md pointer to `just --list` and the command contract; avoid injecting the entire justfile into every worker brief. Existing npm scripts remain usable and authoritative during adoption.

Use simple `npm`/`node` recipe lines where possible. Just defaults to `sh`; Windows needs that shell available or an explicit Windows shell configuration. Recipe lines use separate shell instances, so setting an environment variable on one line does not configure the next. Put environment handling and process ownership in Node helpers and pass arguments as an argument array. Verify quoting with paths containing spaces and smoke grep expressions on Windows and Linux. See [prerequisites](https://just.systems/man/en/prerequisites.html), [shell configuration](https://just.systems/man/en/shell.html), [parameters](https://just.systems/man/en/recipe-parameters.html), and [quick start](https://just.systems/man/en/quick-start.html). `just` was not found on the handler's PATH during this investigation.

Before implementing, write a bounded spec with acceptance for exact exit-code propagation, argument forwarding, no unintended rebuild in built-only mode, stale-build reporting, preserved logs, and preview ownership. Test the same commands directly and through recipes against a stable revision, then compare command text length, model-visible output length, tool-call count, setup repairs, and available scoped token usage on comparable future tasks. Include installation and command-discovery overhead. Do not claim a percentage token reduction from this retrospective sample.

## Prospective token-saving forecast

Recorded 2026-10-16, before implementation or a measured comparison. These are judgmental predictions informed by the retrospective patterns above, not estimates calculated from a token baseline. Freeze these numbers for later scoring; record revisions separately.

| Intervention | Predicted median reduction in total task tokens | Subjective 80% plausible interval |
| --- | ---: | ---: |
| Justfile aliases/bundles only, ordinary tool output retained | 1% | -3% to 5% |
| Initial recommended package: recipes, concise success output with retained logs, argument handling, and a short discovery pointer | **8%** | **-5% to 20%** |

The primary forecast is **8%** for the initial recommended package on representative Bezeg implementation/fix tasks that require verification, after initial setup. Negative savings mean an increase in tokens. The interval expresses uncertainty about the observed median in a comparable evaluation; it is not a statistically fitted confidence interval. Documentation/research-only tasks and a larger preview-lifecycle implementation are outside this primary population. No forecast of equivalent monetary savings is implied: caching and input/output pricing differ.

Secondary prediction: median newly exposed command/verification text falls **65%**, with a subjective 80% plausible interval of **35% to 85%**. Count generated shell/tool-call text and model-visible command results, including command discovery, summaries, polling, and failure-log reads, once when first exposed. Exclude source/spec reads and implementation edits. Compare what the model actually receives, after existing tool truncation; full on-disk log sizes are not the baseline. This secondary metric isolates the mechanism and must not be reported as a 65% reduction in whole-task tokens.

Rationale: most task context is source, specifications, implementation, review, and reasoning, which recipes do not remove. Repeated verification setup and noisy successful output are a smaller but recurrent share. The 8% prediction implicitly assumes roughly 12% of baseline total token usage is affected and that about two-thirds of that share is removed (12% × 65% ≈ 8%). The 12% share is an explicit unmeasured assumption, not a result of the session scan. Existing output caps, additional discovery, failure-log reads, and helpers that encourage unnecessary checks could erase or reverse savings.

### Measurement and scoring contract

- Evaluate the first 20 eligible matched task pairs selected prospectively across UI/control fixes, localization/content changes, and graph/runtime work, rather than selecting successes afterward. Match the same task/spec, starting revision, model/effort, tools, required checks, and worker policy. Use isolated checkouts and fresh contexts for both arms; randomize arm order where possible. The two arms must not see each other's solution. If paired replay is impractical, label matched observational results as weaker evidence and disclose differences.
- Primary task tokens are cumulative model input plus output across the handler and all workers, from task start through accepted completion. Count input on every request, including cached input once within that request's input total; do not add the cached subset a second time. Count reported output/reasoning consistently across arms according to the provider's telemetry. Include failed attempts, repairs, tool-result rereads, recipe discovery, and evaluation-record work required in both arms. Missing worker/handler usage makes a pair incomplete for the primary metric; do not treat it as zero.
- For each pair, savings = `100 × (baseline tokens - intervention tokens) / baseline tokens`. Score the **median of the 20 pair savings**, not the ratio of aggregate totals. Publish all pair results, the median, aggregate savings separately, task mix, and incomplete/blocked pairs. Do not drop failures silently or substitute cheaper incomplete work for accepted results; report acceptance and coverage alongside tokens. If fewer than 20 complete pairs are available, results remain interim.
- Score the primary forecast by absolute percentage-point error from 8%, and whether the measured median lies within -5% to 20%. A zero/negative median contradicts the practical claim of a typical saving even if it lies within the uncertainty interval. One outcome cannot establish that an 80% interval is calibrated. Score the 1% aliases-only forecast only if that separate arm is actually tested.
- Report implementation, installation, maintenance, and pilot instrumentation tokens separately, then show net cumulative savings after those costs. The 8% forecast is a steady-state task forecast, not an assertion that adoption pays back immediately. Break-even occurs when cumulative avoided task tokens exceed adoption/maintenance tokens; if savings are nonpositive, no token break-even has been demonstrated.

Illustration only: a baseline task using 100,000 total tokens would use 92,000 at the point prediction. That is not a measured Bezeg baseline.

## Source traceability

Session IDs above refer to first-party local Codex command records, not inferred activities from chat summaries. The CI repair was also cross-checked through the app's `read_thread` tool under its exact title. Raw transcripts and mined command bodies are deliberately not committed. Repository links establish the current command contracts; historical examples describe the commands recorded in those sessions, which may predate the current source.

## Addendum: Claude Code sessions

Added 2026-10-16 after the initial recipes landed; the frozen forecast above is unchanged. Scope: 152 local Claude Code transcripts (parent and subagent) for the main checkout and its worktrees, 7,156 shell commands, of which 2,566 ran after the Vite migration (2026-10-13). Counts are commands containing a pattern, with the same caveats as above. Only post-migration counts are used for decisions.

| Candidate pattern (post-migration) | Commands | Sessions |
| --- | ---: | ---: |
| TypeScript `tsc --noEmit` alone or before other checks | 198 | 53 |
| Localization catalog lookups in `sl.ts`/`en.ts` | 183 | 43 |
| Guided-lesson smoke filtered by lesson id | 137 | 28 |
| `ph-golden.test.ts.snap` restored after a test run | 42 | 19 |
| `gh run list/watch/view` | 18 | 3 |

Outcome: `typecheck`, `smoke-lesson`, `loc`, and `ci` recipes, specified in [the command workflow spec](../specs/just-command-workflow.md#follow-up-recipes-2026-10-16).

Several clusters had environmental causes rather than missing recipes:

- The snapshot restores came from line endings: Git checked out the LF-stored snapshot as CRLF (`core.autocrlf=true`, no attributes), Vitest rewrote it as LF, and Git reported it modified with an empty diff. Reproduced in a fresh worktree; fixed with `.gitattributes`, not a recipe.
- Agent shells could not find `just` until after the initial recipes landed, so later sessions still called `npx tsc`/`vitest` directly.
- `CI=true`, `react-scripts test`, copying worktrees to temporary folders, and most `node_modules` junction failures belong to the Create React App/Jest era (Jest misread `.claude` in worktree paths).
- Port inspection and `Stop-Process` calls mostly stopped servers the same session had started in the background.

Fetch/rebase/push recurred (18 pushes in 8 sessions) but stays manual, as recommended above.
