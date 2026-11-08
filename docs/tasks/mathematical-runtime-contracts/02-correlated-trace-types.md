# 2. Correlated trace event and note types

Status: accepted 2026-11-08 by the Controls handler ([evidence](02-correlated-trace-types.evidence.md); engineering review found no blocking issues; type-only, so no smoke). Source: [specification, section 2](../../specs/mathematical-runtime-contracts.md#2-correlated-trace-event-and-note-types), acceptance T1–T3 and shared verification. Precedes task 3; owns shared trace interfaces while active.

## Scope and entry points

Start at `src/compgeo/trace.ts`, `src/compgeo/sweep/sweepTrace.ts`, the monotone partition producer, and `src/graphs/compgeo/monotonePartitionRun.ts`. Inventory affected producers, folds, constructors, run adapters and tests before changing the generic contract. Expand to the other current trace algorithms only as required to preserve end-to-end kind/payload and algorithm-note typing.

## Work and completion

1. Add compile-time fixtures for a valid event, a mismatched known payload and an invalid algorithm note. Confirm invalid examples compile against the old contract, and that the final negative checks are exercised by `just typecheck`; runtime tests alone do not prove a type restriction.
2. Preserve kind/payload correlation through event arrays, constructors, fold callbacks and adapters. Keep note keys specific to their producing algorithm. Use monotone partition as the first complete path, then migrate all affected current consumers rather than leaving a permanently erased compatibility interface.
3. Remove payload-restoring casts, repetitive property probes and redundant note allowlists made unnecessary by the stronger interface. Preserve intentional compatibility handling for genuinely unknown event kinds; keep it distinct from malformed known events and deliberate handling of new known vocabulary.
4. Complete T1–T3 with unchanged exact event/state/output evidence. Identify any unavoidable internal constructor assertion and its proof separately from consumer assertions; widening the contract to make callers compile is not acceptance.

## Verification and return

Run `just typecheck`, focused trace/sweep and migrated algorithm/run tests, final unit suite, lint and build. Check current note/readout mappings and pure fold behavior, including unknown-event tolerance. If the diff is entirely type strengthening with unchanged runtime behavior and sufficient unit coverage, record that browser smoke is unnecessary; changed adapter behavior requires affected-route smoke under the shared contract.

Return the producer/consumer inventory, rejected and accepted type fixtures, removed workaround locations, event/output comparisons, revision/results and any remaining intentional generic path. Hand the settled interface to task 3.
