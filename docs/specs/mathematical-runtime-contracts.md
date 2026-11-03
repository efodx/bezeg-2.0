# Mathematical runtime contracts

**Status:** planned, 2026-11-03. The owner requested implementation tasks for the five additional architecture recommendations. This change publishes the [task queue](../tasks/mathematical-runtime-contracts/README.md); application implementation has not started.

**Source:** review of `f9376773acb0cf48919a4975bde41faea1cfcb17...6d5f8470c668c6649c5d43f4b35478a4873f96b8` (October 31–November 3), followed by the owner's instruction to create tasks and push them. The series issue below was reproduced; the other recommendations address observed duplication and weak contracts, without an established runtime failure or performance claim.

## Outcome and scope

Concentrate existing mathematical evaluation, trace playback and live model ownership, and preserve mathematical invariants through TypeScript interfaces. Each task must remove knowledge from existing callers rather than add a parallel framework.

The five tasks extend the existing architecture. The completed [architecture deepening backlog](architecture-deepening-backlog.md) remains complete. The separate [lesson-authoring architecture](lesson-authoring-architecture.md) owns shared controls, lesson metadata/adaptation, family registration, owned standalone scenes, and persisted validation/projection. This queue does not duplicate those workstreams.

Shared contracts:

- Keep the current stack, static client-only hosting, mathematical domains, Slovenian default and bilingual behavior.
- Preserve published routes, Demonstration and lesson identities, Preset collection keys and supported file shapes. Live model representation may change internally. Retain the existing persisted-data authority policy at import and keep trusted checkpoints distinct from file validation. Record any necessary break and its user impact before accepting it.
- `SceneStore` writes remain synchronous: later actions in the same scene tick see earlier writes. Preserve host commit timing for ordinary board effects and existing synchronous replacement/rollback behavior.
- Preserve board/controller disposal, stopped-by-default playback, explicit export ownership, meaningful mathematical checks and independently expected drawing evidence.
- Keep domain-specific decisions in their current domain modules. Use small composed modules and existing `IterationController`, `SceneStore`, graph host and scene replacement contracts; a new generic simulation, result or state framework is outside scope.

## 1. Stable geometric-series evaluation

**Evidence:** `src/analysis/geometricSeries.ts` uses a closed-form partial sum, an accumulated prefix-sum sequence, and subtraction from the limit for the tolerance decision. `src/analysis/geometricSeriesModel.ts` and `src/graphs/functions/GeometricSeriesGraph.tsx` consume these paths separately.

At the reviewed revision, accepted inputs `a=1`, `q=0.999999999999`, `terms=50` gave a readout of `50` and a last accumulated sum of `49.999999998775024`. Accepted `a=1`, `q=0.1`, `tolerance=1e-18` reported first term `17`; its mathematical tail is approximately `1.1111111111111111e-17`. The first qualifying term for that case is `19`.

One pure evaluation declaration should supply coherent terms, prefix sums, limit and tail error to the graph/readout/model consumers. Keep public helpers where useful, delegating to the same numerical rules. Choose stable finite-sum arithmetic for the existing bounded domain; evaluate the convergent tail directly instead of subtracting nearly equal quantities. A single module may deliberately use different numerical formulas for the finite sum and tail, with their mathematical relationship explicit.

Acceptance:

- **N1:** Both reproduced cases have regression checks that fail against the reviewed implementation. Near-one finite sums agree with an independent exact or higher-precision reference within a stated tolerance; the second case reports term `19`, with the strict inequality checked before, at and after the threshold.
- **N2:** Bars, captions, inspector readouts and tolerance statuses consume coherent values. Cover `q=0`, `q=1`, `q=-1`, values near both unit boundaries, convergent/divergent cases, the term cap, and supported endpoints without NaN or unintended domain changes.
- **N3:** Keep the term cap, first-term semantics, no-limit states, strict tolerance comparison and stopped/reset behavior. A finite picture remains an illustration; numerical results do not acquire a new proof claim.

Source contract: [school function graphs, S5](school-function-graphs-lessons.md#s5-geometric-series-and-partial-sums).

## 2. Correlated trace event and note types

**Evidence:** `src/compgeo/sweep/sweepTrace.ts` combines an independent union of kinds with an independent union of payloads. A TypeScript probe accepted `{kind: 'pop', payload: {item: 1}, predicateCount: 0, noteKey: 'typo-note'}` as a sweep event. `src/compgeo/trace.ts` also erases each algorithm's note-key union to `string`. Run adapters recover payloads and notes with property checks, casts and repeated lists.

Preserve kind/payload correlation in the event and trace interfaces, including the fold and constructor. Preserve algorithm-specific note types from producers through their run adapters. Begin with monotone partition, then migrate every affected producer and consumer needed to close the shared contract. Keep independent algorithms' event vocabularies distinct. Unknown-event tolerance remains explicit where the existing generic fold promises it; known malformed events must not become valid through that tolerance.

Acceptance:

- **T1:** Compile-time fixtures reject mismatched known kind/payload pairs and invalid note keys for each migrated algorithm, and accept valid events. The negative fixtures run under the production TypeScript check and fail if the relevant restriction is removed.
- **T2:** Current sweep producers, folds, traces and run adapters retain their correlation without payload-recovering consumer casts or duplicated note allowlists. Any remaining generic event path has a named compatibility reason. Broad assertions or widened strings cannot substitute for the contract.
- **T3:** Exact event ordering, predicate counts, output values, state-at-step results and intentional unknown-event handling are unchanged. A new known event or note requires deliberate adapter handling instead of silently changing the teaching status to a generic phase.

Source contracts: [shared trace core](convexity-hulls-lessons.md#shared-computational-geometry-core) and [sweep algorithms](sweep-algorithms-lessons.md).

## 3. Shared trace playback policy

**Evidence:** hull, interval, Bentley–Ottmann, monotone partition/triangulation, Delaunay and Fortune graphs repeat advancement/completion, button methods, seek/reset coordination and controller lifetime. `traceLessonActions.ts` already shares lesson dispatch, while `IterationController` owns scheduling.

Deepen the existing playback seam with a small composed trace policy around `IterationController`. Graphs supply live run/index access and state commands; the scene store remains the authoritative index owner. Share transition, seek/completion and command coordination across the current trace graphs, preserving each graph's algorithm-specific cadence, input-change policy, export guards and view behavior. Start with hull and interval graphs as two genuinely different consumers, then migrate the remaining repeating consumers. Keep `registerTraceCommands` as the common lesson dispatch entry.

Acceptance:

- **P1:** All migrated buttons and lesson commands use the same transition/policy. Next and scheduled Play reach identical nonempty final states and predicate/readout values. End, empty/refused input, seek away from completion, replay and reset have explicit checks.
- **P2:** Preserve each graph's existing pause/reset behavior for model edits, named-step actions, Preset/checkpoint replacement, export and navigation. Preserve cadence differences and all existing disposal/remount guarantees; no tick may write after disposal.
- **P3:** The graph classes lose their duplicated generic playback choreography. The composed module introduces no mirrored index, new scheduler or algorithm-specific mathematical branching. Unit tests exercise the interface used by real consumers, with real-host coverage for the two pilot graphs and representative remaining families.

Source contracts: [convexity/hulls](convexity-hulls-lessons.md), [sweep algorithms](sweep-algorithms-lessons.md), and [iterative playback ADR](../adr/0012-iterative-playback-controller.md).

## 4. One live function model authority

**Evidence:** `src/graphs/functions/BaseFunctionGraph.tsx` stores `model`, mirrors its fields into flat scene state, reconstructs `stateSnapshot()` with casts, and reconciles authority in capture/replacement/figure paths. The scene store is now synchronous. This is duplicate live authority, separate from the authoring plan's persisted-data projection workstream.

Make the scene store own the immutable live function model, with stable typed access for commands, board callbacks and React consumers. Retain model identity when only host/display state changes, and share one write path. Preserve current board synchronization timing, drag behavior and replacement precedence. A getter that reconstructs a fresh object on every read is not an acceptable replacement for the mirror.

Start with a consumer inventory covering every `BaseFunctionGraph` subclass, including complex and linear maps, plus direct state readers and model/view caches. Prove the representation and identity rules with a simple graph and a cache-heavy graph before completing the base/subclass migration. Keep implementation slices sequential where they change shared contracts; completion covers all affected subclasses and removes the old authority reconciliation.

Acceptance:

- **F1:** Exactly one mutable location owns the live immutable domain model. Commands, inspector snapshots, export and board callbacks read it; generic host/display fields are not reconstructed as domain fields. Remove the old mutable model mirror and the reconciliation/projection code made unnecessary by it.
- **F2:** Model identity is stable across unrelated host/display writes and changes on accepted domain replacement; valid no-ops retain their existing behavior. `modelCache` and `memoView` remain correct without a fresh model object per read, stale results or blanket cache invalidation.
- **F3:** Same-tick multi-action lessons, edits/drags, Reset, language change, Preset/file restore, checkpoint rollback, figure batch entry/return and remount preserve domain values, visible controls and actual board geometry. Test conflicting persisted data/state inputs against the existing authority rule, without introducing a new file format.
- **F4:** All affected subclasses use the final interface; no permanent legacy mirror or parallel state owner remains. Document live state ownership in current architecture after implementation. Coordinate any shared-file edits with the lesson-authoring queue's persistence owner rather than merging the two workstreams.

Source contracts: [synchronous scene store direction](react-architecture-refactor.md), [graph contracts](graph-contract-deepening.md), and [guardrails](../guardrails.md).

## 5. Typed conic variants and solver outcomes

**Evidence:** `src/analysis/conic.ts` allows a circle without a radius and non-circle conics without required directrix data. `src/projective/conic.ts` permits a `unique` five-point result without its conic. Both incomplete result forms compiled in the review probe; consumers compensate with assertions.

Use domain-specific discriminated unions for the analytical conic and five-point solver outcomes. A kind/status must imply the fields its consumers need. Preserve currently returned diagnostic coefficients and classifications, including invalid solver branches that contain a diagnostic candidate; inspect actual returns rather than assuming every invalid result has identical data. Narrow related view types only as needed to preserve this contract.

Acceptance:

- **C1:** Compile-time fixtures reject circle-without-radius, non-circle-without-directrix data and unique-without-conic results. Valid constructors/results narrow to their required fields without consumer non-null assertions or invariant-restoring casts.
- **C2:** Circle, ellipse, parabola, hyperbola, unique, line-pair, pencil and invalid outcomes retain their current mathematical values, diagnostics, degeneracy behavior and visual/readout meaning. No assertions or fallback zeros may hide a missing case.
- **C3:** All actual consumers are migrated and current mathematical/real-host checks remain meaningful. Exact projective arithmetic stays separate from drawing approximations; this task changes neither the coefficient bounds nor the sampled-deviation policy.

Source contracts: [school function graphs, S6](school-function-graphs-lessons.md#s6-conics-focus-directrix-eccentricity-and-the-bézier-bridge) and [projective conics](projective-conics-lessons.md).

## Order, ownership and verification

The [queue](../tasks/mathematical-runtime-contracts/README.md) owns task status and scheduling. Task 2 precedes task 3 to serialize trace contracts and consumers; task 1 precedes task 4 to preserve a settled numerical regression while changing the function base. Task 5 can proceed independently with exclusive ownership of its conic files/tests. Shared graph, fixture and verification resources have one owner at a time.

Each implementation begins with `just --list` and a stable baseline, then uses focused `just unit` checks and `just typecheck`. Final acceptance includes the affected mathematical/contract tests, lint and a production build. Run the full unit suite once per accepted implementation slice, retaining focused iteration. Localization edits additionally require the catalog checks in [localization guidance](../localization.md).

Use [smoke-tester](../../.agents/skills/smoke-tester/SKILL.md) and the [browser checklist](../smoke-tests.md) for changes to control, lesson, drawing or interaction paths. Resolve published routes from current catalog metadata. Pure type-only changes with behavior-preserving unit coverage need no browser run; document that classification. Task 4 requires broad coverage of affected function-derived families and replacement/lesson flows; changes to the shared host/workspace/lesson runtime trigger the full checklist. Benchmark representative interactions before choosing rendering/cache optimizations, preserving settled geometry and reporting measured scope rather than claiming unmeasured speedups.

At completion, report failing-before regression/type checks, independent review where required by [review routing](../agent-workflow.md#review-routing), exact tested revision, commands/results and named coverage gaps. Keep unique evidence alongside the queue and update current-behavior documentation only after implementation. Planning verification checks document scope, source paths, local links/anchors and Git whitespace; publishing these tasks does not mark their application acceptance passed.
