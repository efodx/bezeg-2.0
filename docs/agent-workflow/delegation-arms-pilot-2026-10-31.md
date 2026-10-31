# Delegation arms pilot — 2026-10-31

Question: does folding work into the handler's own loop ([the article on folding subagents into the main loop](https://claude.com/resources/articles/building-agents-when-to-fold-subagents-into-your-main-agent-loop)) beat Bezeg's delegating workflow on a fixed task? Owner-requested pilot, two runs per arm. Observational; two runs per arm cannot validate a default.

## Setup

- Task: eval harness M task `chapter-activity-controls` (replays `aaa5c65`), tooling from `d66c26b`. Calibration passed (reference accepted, base rejected).
- Handler: `claude --bg --agent claude --model claude-opus-5-5 --permission-mode auto`, identical prompt per arm. Arms differed only in `AGENTS.md` delegation lines and the opening line of `docs/agent-workflow.md`:
  - **Baseline**: current workflow (delegate separable implementation; review and smoke subagents per routing).
  - **Handler-only**: no implementation, fix, test or research workers; review and smoke subagents still allowed.
  - **Single loop**: no subagents at all; the handler reviews and smoke-tests itself.
- Runs were paired (one baseline with one handler-only, then the two single-loop runs together); grading ran between pairs. Each sandbox had its own `SMOKE_PORT`.
- Cost: every transcript request priced at first-party list prices (Opus 5.5 $4/$20, cache write 1.25× or 2× input, cache read $0.20; Sonnet 5.5 $2/$10, cache read $0.20). API-equivalent, not subscription billing.

## Results

| Run | Elapsed | Handler | Workers | Total cost | Gates | Contract smoke* |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline 1 | 35 min | $2.03, 41 req | $0.31 (1 Sonnet test writer) | **$2.34** | unit: two 15 s timeouts under load; file passes alone | 16/16 |
| Baseline 2 | 55 min | $2.08, 45 req | $1.35 (2 Sonnet, 68 req) | **$3.43** | pass | 16/16 |
| Handler-only 1 | 23 min | $3.86, 71 req | $0.43 (Sonnet smoke + review) | **$4.29** | pass | 16/16 |
| Handler-only 2 | 33 min | $3.26, 68 req | $0.27 | **$3.53** | pass | 16/16 |
| Single loop 1 | 46 min | $3.74, 73 req | — | **$3.74** | pass | 16/16 |
| Single loop 2 | 52 min | $3.04, 65 req | — | **$3.04** | pass | 17/17 |

\*Excluding the hidden check that waits for `.activity-context-prompt`, a class that exists only in the reference solution; single loop 2 happened to choose the same class name.

Arm means: baseline $2.89 / 45 min; handler-only $3.91 / 28 min; single loop $3.39 / 49 min. Every run met the graded spec.

## Observations

- Opus handler turns dominate cost. Each extra handler request re-reads a 100k+ context; Sonnet worker requests are cheap even in number (baseline 2: 68 requests, $1.35).
- The baseline handler kept the tightly coupled source change itself in both runs and delegated tests and smoke, so "delegating" here meant handing verification and test writing to Sonnet.
- Handler-only was fastest but most expensive: its handler wrote the tests, while review and smoke went to Sonnet in parallel.
- Single loop was slowest and cheaper than handler-only but dearer than baseline.
- Quality differences outside the grader: handler-only 1's delegated smoke found a pre-existing Presentation-mode collapse and the handler fixed it; handler-only 2 and others noted or missed it. Diff shapes differed (unit tests and helper modules in handler-only and single loop 1; smoke-only coverage in baseline 1).

Tentative reading: on this M task, delegating test writing and smoke to Sonnet lowered cost; folding everything into the Opus loop did not. A future comparison on a task that splits less naturally, or on an S task, could support or reject this.

## Harness defects found

Fixed during the pilot: sandboxes lacked `.claude` agents and hooks (`b8e156d`) and `scripts/test-slots.cjs` (`d66c26b`).

Fixed after the pilot:
- `chapter-activity-controls` contract smoke depended on the reference-only class `.activity-context-prompt`. A maintained copy under `tools/agent-eval/hidden/` measures the activity prompt paragraph instead; it passes on the reference and all six pilot builds and still fails on the base. Calibration cannot detect such leaks.
- `claude_worker_watch.py` searched only `~/.claude/projects/*bezeg*`, so watchers failed in every sandbox; it now searches all project folders by unique ID.
- Background handlers commit on a sandbox worktree branch; `grade` now adopts the single branch that extends an untouched sandbox branch (pilot runs were fast-forwarded by hand).
- The README documents the one-time workspace trust prompt, background launch and per-sandbox `SMOKE_PORT`, and grade reports include estimated cost.

Known behavior: `claude agents --json` can report `busy` after the session finishes while a leftover background shell runs; check the session log for the final recap. In baseline 2 that shell was a smoke worker's Playwright script (`node part2.cjs` with headless Chromium) that kept running for about two hours after the session ended, survived `claude stop`, and locked the sandbox until its process tree was killed. Check for such processes before deleting sandboxes.
