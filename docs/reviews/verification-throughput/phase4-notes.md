# Phase 4 notes: per-file overhead

Date 2026-11-08/09. Machine heavily loaded by other checkouts during the runs (about 20 node processes), so only alternated A/B pairs are trusted.

## Kept
- **A, lazy JSXGraph** (`src/setupTests.ts`): the setup no longer imports `jsxgraph`. JSXGraph publishes `window.JXG` when a file imports it; `beforeEach`/`afterEach` patch whichever copy is loaded (MathJax debug filter, `initBoard` tracking) and free boards created during the test. A JSXGraph first loaded inside a test is patched in `afterEach` and its boards are freed and drained like before.
- **B, `projects` split** (`vite.config.mts`): `dom` (jsdom + setup) and `kernel` (node, no setup) over `src/{analysis,compgeo,bezeg,projective,linear}`. `KERNEL_NEEDS_DOM` is empty: all kernel files passed in node. Triple-slash reference removed (lint rule; `vitest/config` is now imported).

## Measurements
Full-run wall cannot be compared: editing `src/setupTests.ts` is a shared path in `scripts/transient-state-scope.cjs`, so the dirty tree widens the local sweeps (11371 tests at baseline, 12606 after). Load also inflated file-seconds (1271 -> 2198 -> 4569). Controlled pairs instead, kernel directories only (161 files, alternated, same load):

| Config | Vitest Duration |
|---|---|
| old setup + old config | 159.5 s, 156.1 s |
| A only | 127.4 s, 134.5 s |
| old config (A) vs A+B, pair 1 | 140.6 s vs 59.8 s |
| old config (A) vs A+B, pair 2 | 202.3 s vs 71.4 s |

Baseline full run (unset BEZEG_SWEEPS): 629.6 s, Duration 628.4 s (tests 42%, environment 26%, import 17%, setup 12%, transform 3%), 653 passed + 3 skipped of 656; `test-cost --save`: 660 files, 1271.4 s.
A+B full run: 849 s wall, Duration 847.9 s (tests 59%, import 17%, environment 17%, setup 4%, transform 3%), 653 passed + 3 skipped of 656 (same count) but 12606 tests (wider scope), so not comparable; load-inflated. Setup share fell 12% -> 4% and environment 26% -> 17% despite that.
Always-run step (12 files): baseline wrapper 66.0 s (Vitest Duration 14.56 s); after A+B 27.8 s wrapper. Wrapper time includes the memory-wait, so treat as indicative only.

## Checks
`just typecheck`, `just lint vite.config.mts src/setupTests.ts`, `just tooling-test` pass. Sharding: `--shard=1/2` and `2/2` over 95 files ran 48 + 47 = 95, each file once.

## Not verified
- A clean full-run wall comparison (needs a quiet machine and a committed setup change, or `BEZEG_SWEEPS` fixed).
- `just check-changed` completion: my `timeout 160` killed it; a vite.config change makes it select everything anyway.
- Part-file placement per shard under the new projects (only counts checked).

## Handler 3 acceptance

- Correction: with `extends: true`, a project's `setupFiles: []` did not remove the root's setup file, because inherited config arrays merge. `setupFiles` now lives only in the `dom` project. The kernel project then ran 161 files (3160 tests) in 27.0 s with no setup and no environment (`just unit --project kernel`, 5 workers).
- Final full local run on the accepted config: 653 passed and 3 skipped of 656 files, 12606 tests, 884.6 s wall on a loaded machine. Duration breakdown: tests 62%, import 16%, environment 15%, transform 3%, setup 3%; the baseline had environment 26% and setup 12%. The wall time is not comparable, because a `setupTests.ts` change widens the local sweep sample.
- Decision: accepted. The deciding measurement is the next hosted run, which always runs the full sweeps: compare the summed unit-shard Vitest time with runs 42524584056 and 42527684457. If it does not fall, revert.
