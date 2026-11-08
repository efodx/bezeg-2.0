# Where stream handlers block on verification, and how to decouple

Read-only research, 2026-11-08. Paths relative to ``. No tests or builds were run. Plain git commands on this machine took more than 60 s during the research (load from running streams).

## 1. Sequence from "slice done" to "next slice can start"

Sources: handler loop `docs/tasks/feature-streams/README.md:105-112`, handler card `docs/agent-workflow/handler-card.md:22-24`, AGENTS.md Git workflow, `docs/commands.md:30-32`, `scripts/publish-gate.cjs`, `scripts/commands.cjs`, `scripts/test-slots.cjs`.

1. **Accept** (handler card :22, README :109): diff review, review workers, focused `just unit <path>` / `just typecheck` / `just lint`, smoke when routes/controls/lessons change (`just build` + `just smoke-built`).
   - Wait A, memory ramp gate: every `typecheck`, `lint`, `unit` (even path-filtered), `build`, `check*`, smoke start waits until no other *live* runner started less than 60 s ago (`scripts/test-slots.cjs:32` `RAMP_MS = 60_000`; `:183` busy = ramp holder alive and `< RAMP_MS`; `scripts/commands.cjs:385-387, 396`). Effective machine-wide admission rate: one heavy-or-light `just` start per minute while the previous is still running. With 6 streams x 2-4 workers each issuing `just typecheck`/`just unit <path>`, the queue alone can be several minutes. Documented at `docs/commands.md:36` ("starts are spaced a minute apart machine-wide").
   - Wait B, test slots: `check`, `check-changed`, `build`, `smoke*`, `controls-fixture`, unfiltered `unit` need one of 2 machine-wide slots x 5 workers (`scripts/commands.cjs:376-378, 394`; `docs/commands.md:36`, env override `BEZEG_TEST_SLOTS=2`, `BEZEG_TEST_WORKERS=5`). The slot is held for the *whole* command (`commands.cjs:394-404`), so for `check-changed` it covers tsc + whole-repo lint + unit + build (`commands.cjs:469-470`), not only Vitest. Observed waits: 386 s (`docs/agent-workflow/evaluation-log.md:1421`), 20 and 7 min (`:1498`), 632 s for a mere `just build` (`docs/tasks/feature-streams/learn-ui.md:46`), 20 min at the memory gate (`docs/tasks/feature-streams/platform.md:36`).
2. **Commit** with explicit paths (handler card :24).
3. **Publish**: `just publish --recipe runtime --base <c> --commits <ids>` (`docs/commands.md:30`, `scripts/publish-gate.cjs:123-250`). Stages, all synchronous:
   - `clean` (`publish-gate.cjs:176-181`): checkout must be clean. So nobody (handler or worker) may edit the stream worktree for the whole gate; the controls handler had a recheck fail because of one untracked brief (`docs/reviews/feature-streams/controls/handler-handoff-3.md:33`).
   - `fetch` + `reconcile` = rebase in place onto fetched master (`:198-209`).
   - `verify:check-changed <master>` (`:228-231`, recipe `:37-41`) = full `tsc`, full `eslint .`, `vitest --run --changed <master> --passWithNoTests`, full production build, all inside one test slot and behind the memory ramp (waits A and B again).
   - `recheck` HEAD and cleanliness (`:233-237`), then fast-forward `push` (`:239-241`).
   - If master moved during verification the push is rejected; the documented recovery is "rerun for a fresh rebase and verification" (`docs/commands.md:32`, `publish-gate.cjs:240`, spec criterion 7 `docs/specs/fail-fast-publication-gate.md:69`). Measured reality: "`master` moves every few minutes, and a runtime publish gate takes 16-50 minutes under load" (`handler-handoff-3.md:33`); briefs budget "30-50 min under load" for `check-changed` (`docs/reviews/feature-streams/controls/foundation-3-brief.md:27`, `foundation-4-brief.md:23`). The probability of losing the race is therefore high, and each loss costs a full gate again. Example: master moved 4 commits during an owner wait, so "a fourth full check ran (1020 s)" (`evaluation-log.md:1935`). Spec history: one stream "ran three 24-41-minute gates in a row" (`fail-fast-publication-gate.md:7`).
4. **Post-push**: gate prints "check `just ci <sha>`" (`publish-gate.cjs:265`; `docs/commands.md:30`). No instruction tells the handler to sleep until CI finishes, and the README forbids waiting inside a session (`README.md:49`). But "A push that fails CI is fixed by the stream that pushed it before that stream pushes anything else" (`README.md:99`; `docs/commands.md:32`; spec `:7`), so the *next* publish of that stream is soft-blocked on the previous CI result (CI ~9 min unit shards, more with 4 Chromium smoke shards and deploy; `.github/workflows/browser-smoke.yml:13, 60-80, 116-135`). F6 acceptance explicitly includes "hosted CI after push" (`README.md:64`); successors are told to read hosted CI first (`evaluation-log.md:1972`).
5. **Next slice**: README :107-108 says rebase onto `origin/master` and dispatch the next brief. Workers cannot touch the worktree while the gate runs (clean requirement), so in practice the next slice starts after the push lands; the controls handoff tells handlers to write the next brief under `.command-logs/` "until the push lands" (`handler-handoff-3.md:33`). On `BUDGET SOFT/HANDOFF` the handler must "finish integrating" before launching the successor (`README.md:111`; `docs/agent-workflow.md:54` "Commit and push completed, verified work"), so handoff also waits for the gate.

### Do streams depend on each other's pushes?

Yes, three ways:
- **Gates** are read from `origin/master` (`README.md:37`). A stream with only gated work ends with `Run state: waiting on ...`, and the supervisor polls every 10 min (`README.md:49, 140-142`). Latency = provider's gate time + up to 10 min poll + session startup.
- **Shared files** (`sl.ts`/`en.ts`, registration files, `BaseGraph.tsx`) must be pushed "promptly" / "as soon as accepted" to keep rebase conflicts mechanical (`README.md:80-87`), so streams queue behind each other's pushes to avoid conflicts.
- **The fast-forward race**: every push by any stream invalidates every other in-flight gate (step 3). With N streams publishing concurrently, at most one gate per master revision can succeed; the others redo rebase + `check-changed`. This is the main source of "streams don't really start until a previous publish has finished".
- **CI cancellation**: every job has `cancel-in-progress: true` per ref (`browser-smoke.yml:22-24, 44-46, 69-71, 89-91, 133-135`), so a push from stream B cancels CI for stream A's push. Stream A then cannot get a CI verdict on its own commit; it reads the next run that includes it. A cancelled run silently skipped deploy once (`evaluation-log.md:1972`).

## 2. `vitest --changed <ref>` selection

- `scripts/commands.cjs:464-470`: `unit(['--changed', ref, '--passWithNoTests'])`. Vitest lists files changed since `ref` with git (committed and uncommitted), then selects test files whose import graph reaches them (static module-graph resolution of each test file); a change to `package.json`, the Vite config or the setup file runs everything (`docs/commands.md:16`). File reads (not imports) are not followed. Resolving every test's import graph is itself an up-front cost on each run.
- In the gate, `ref` is the fetched master after the rebase (`publish-gate.cjs:38`), so the diff is only the slice's own changes; a rebase over a moved master does not widen selection (good), but tsc, lint and build are always whole-repo.
- Measured selection (spec `fail-fast-publication-gate.md:7`): a one-line change to `BaseGraph.tsx` selects 163 of 614 test files, `NumberInput.tsx` 283, `LessonSession.ts` 211, always including the `GraphTransientState.part*` files. The spec concludes a gate run is "roughly half to three quarters of a full one, not a fraction".
- Fan-in approximations now (650 test files under `src/`):
  - `src/localization` (index imports `./sl` and `./en` statically, `src/localization/index.ts:2-3`): imported directly by 576 source files, 265 of them test files. Transitively, essentially every component, graph, lesson and page test reaches it; a `sl.ts`/`en.ts` edit most likely selects the large majority of the suite (estimate 500+ of 650; not measured).
  - `sl.ts` frequency: 24 of 343 non-merge commits since 2026-11-05 touched `src/localization/sl.ts` (about 7% of all commits, a much larger share of runtime slices, since every new UI or lesson slice adds keys).
  - Graph registry / `BaseGraph` / `LessonSession` / `NumberInput` / chapters: 71 test files import one of `graphFactories`, `demonstrations`, `learningChapters`, `LessonSession`, `NumberInput`, `BaseGraph` directly; 61 source files import `BaseGraph` directly.
  - Shared-path changes (`src/graphs/base/`, `graphFactories.ts`, `src/graphs/curves/object/`, `src/bezeg/`, build config) also switch the transient-state parts from the 14-graph sample to every graph, about 13 CPU minutes (`docs/commands.md:40`, `scripts/transient-state-scope.cjs`).
- Conclusion: for the typical runtime slice (UI or lesson work that adds locale keys), `check-changed` is close to a full `just check` plus the import-graph resolution overhead. The 2026-11-07 switch from `check` to `check-changed` helped narrow slices but not localized ones.

## 3. Is hosted CI awaited?

Not as a blocking wait, by instruction: `README.md:49` forbids sleeping/polling in a session, and nothing says "wait for CI before the next slice". It is awaited indirectly:
- before the stream's *next push* (`README.md:99`, `docs/commands.md:32`, spec `:7`);
- at F6 acceptance, "hosted CI after push" (`README.md:64`), with gate records such as `docs/reviews/advanced-bezier/ab-a-6-gate.md:59` ("every job read, deploy included");
- by successors at session start (`evaluation-log.md:1972`).
Because the local gate is the long pole (16-50 min) and CI is about 9+ min, CI is rarely the bottleneck; the local gate and its race are.

## 4. Decoupling proposals, evaluated against the constraints

Constraints that bind: handler owns publication, never force-push, fast-forward to `origin/master` only (AGENTS.md Git workflow); verify the rebased revision before pushing (spec stories 5, 11; criteria 4, 7); fail fast, nothing pushed after a failure (spec criterion 1); preserve unrelated working-tree changes; hosted CI is the full-suite deploy gate (`docs/commands.md:30-32`); heavy runs only through `just` (`README.md:93`); a CI break is fixed by the pushing stream before its next push (`README.md:99`).

### P1. Publish from a dedicated, disposable publish worktree (high value, low risk)
Make `just publish` create (or reuse) `.claude/worktrees/<stream>-publish`, check out the declared commits there, and run fetch/rebase/verify/push in it, in the background. The stream worktree stays editable, so the handler dispatches the next slice immediately; workers keep editing. On success, the stream worktree runs `git fetch && git rebase origin/master` (its pushed commits drop out as already applied).
- Fits: spec forbids the gate from "choosing a new worktree" (`fail-fast-publication-gate.md:43`, "or choose a new worktree"); that line needs a recorded change (ADR-worthy: real alternatives). Otherwise all invariants hold: same verification of the rebased revision, same fast-forward, no stash, the handler still owns the push.
- Cost: one extra `node_modules` (junction or `npm ci`, see `new-pc-setup.md`; controls already uses its own `npm ci`, `controls.md:46`), disk, and the handler must not stack a second slice's publish on top before the first lands (P2 handles that).
- Risk: the next slice is built on unpushed commits; if the gate fails, the handler fixes in the stream worktree and republishes both. Acceptable: fail fast still holds.

### P2. Serialize pushes through a local merge queue instead of racing (high value)
The race (step 3) is the dominant cost: gates are 16-50 min and master moves every few minutes. Options:
- (a) A machine-wide publish lock (same mechanism as test slots, `scripts/test-slots.cjs:64-137`): only one gate verifies at a time; others wait for the lock *then* fetch and rebase. A gate then never loses a race against a local stream (Codex or the owner can still push). Waiting is in a background process, not a session (honours `README.md:49`). Throughput is bounded by gate time; combine with (b) or P3.
- (b) A queue runner (single process, like the supervisor) that takes declared slices from all streams, rebases them in order, batches compatible ones (P5), runs one `check-changed` for the batch and pushes. Streams submit and continue. Handler acceptance is still recorded by the declaration (`fail-fast-publication-gate.md:45`); ownership of the push moves to a script acting on handler-declared slices, which needs an AGENTS.md wording change ("only the main handler may push").
- (c) Cheapest interim: on a rejected push, do not rerun the full gate when the incoming master commits touch none of the slice's files and none of the files the slice's selected tests import; rerun tsc + build only (they are global), then push. The spec rejected a related shortcut ("skipping the unit run after a docs-only rebase", `fail-fast-publication-gate.md:7`) because it "needs the previous verified base recorded between runs"; the gate could record the verified base and selected test list in its log/report to provide that. Residual risk (semantic conflicts reaching through imports) is covered by hosted CI, which the runtime recipe already relies on.

### P3. Shrink what the gate verifies (medium value)
- Release the slot after Vitest: hold the test slot only around `unit`, not tsc + lint + build (`commands.cjs:394-404`). Build and tsc are CPU-heavy but short; the memory gate already covers them.
- Make the 60 s ramp spacing apply only to heavy commands; let `typecheck`, `lint` and path-filtered `unit` (which skip the slot) start without the machine-wide ramp, or shorten `RAMP_MS` for them. Keeps memory safety (the floor check remains) while removing the 1-start-per-minute serialization of quick focused checks.
- Run the unit selection with `--changed` but exclude localization-only reach: when the slice's only shared-module change is appended keys in `sl.ts`/`en.ts` (typed by tsc), select tests by the slice's other files plus `src/localization/*.test.tsx` and `lessonMathNotation.test.ts`. Key additions cannot change existing keys' behaviour; tsc already enforces catalog parity. This removes the "nearly everything" selection for the most common shared edit. Needs a small selection script; CI still runs everything. Risk: a test that snapshots the whole catalog or counts keys; include localization tests to cover that.
- Run lint on changed files only in the gate (whole-repo lint is in CI).

### P4. Do not tie the next slice to the previous push's CI (already mostly true; clarify)
Keep "fix a red CI before your next push" (`README.md:99`) but make it explicit that starting, accepting and even *gating* the next slice need not wait for CI; only the push stage checks `just ci <prev sha>` and stops if red. Because cancel-in-progress (`browser-smoke.yml`) means a stream's own run may be cancelled, define "green" as the latest completed run containing the commit. Fix-forward on red is already the policy. Low risk.

### P5. Batch publishes (medium value)
Accept several slices locally and publish them in one gate (one rebase, one `check-changed`, one CI run). Already allowed: `--commits` takes a list. Trades latency for gate count; works best with P1 (keep working while the batch accumulates) and against shared files with frequent conflicts. Constraint: AGENTS.md asks for "small, logically separate commits", which batching keeps (commits stay separate; only the push is batched). Downsides: a larger blast radius on red CI, and gated consumers wait longer for providers' gates; exempt gate-opening and shared-file (registration, locale) slices, which README says to push promptly (`README.md:82-83`).

### P6. Relax the shared-file "push promptly" pressure
Locale keys are the most common conflict source and the widest test selection. Since keys go in feature-owned anchored blocks (`README.md:82`), conflicts are already mechanical; consider letting `just publish` auto-resolve "both sides added lines at different anchors" in `sl.ts`/`en.ts`/evaluation log (AGENTS.md already says to keep both sides) instead of stopping, so streams can push less often without fearing conflicts.

### P7. Gate wake-up latency
The supervisor's 10-minute poll (`README.md:141`) adds up to 10 min after a gate opens. Cheap fix: the provider's publish, on success, can trigger the supervisor (e.g., touch a file it watches or have the supervisor poll every 2 min; polling is a plain script and free).

### Not recommended
- Pushing without the local gate and relying on CI alone: violates the fail-fast spec and the "verify the rebased revision" rule, and a red master blocks every stream's CI signal (cancel-in-progress plus "fix before next push").
- Force-push or GitHub merge queue with PR branches: force-push is forbidden; a GitHub merge queue needs branch protection and PRs, which the spec lists out of scope ("branch-protection changes", `fail-fast-publication-gate.md:77`) and would change the publishing contract in AGENTS.md. It is the principled long-term answer to the race but a larger decision (ADR).

### Suggested order
1. P3 slot/ramp scope (small script change, immediate relief for every agent's focused checks).
2. P1 publish worktree in the background (unblocks the stream while its gate runs).
3. P2(a) publish lock, or P2(c) skip-rerun on non-overlapping rebase (stops the race loss).
4. P3 locale-only selection; P4 wording; P5/P7 as needed.
