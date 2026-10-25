# 1. Verify lesson restoration through the real-graph contract

Status: implemented; unit contract (`5ebb45e`), 7-row browser `en: Exit` sample and hook deletions, mapping and fault evidence in [coverage.md](coverage.md). Source: [specification](../../specs/test-consolidation.md), acceptance 1–3 and 6–9.

## Scope and entry points

Own the restore/re-entry contract in `src/graphs/base/GraphTransientState.test.tsx` or a focused companion using `realGraphTestHarness.tsx`, plus replacement of the exit/re-entry template in `tests/guided-lessons.smoke.spec.cjs`. Reuse `LessonSession` and the real graph capabilities. Do not introduce another checkpoint manager. Read the current guided-lesson spec before implementation.

First inventory all 45 rows' preparation, during-lesson, restoration and stable-count probes. Record what each uniquely catches and baseline full/focused timings. Choose browser representatives by actual state/restoration/resource implementations: ordinary function graphs, curve reconstruction, rational effective weights/standard form, spline auxiliary state, PH child boards and animation must be accounted for; combine only where demonstrated shared behavior warrants it.

## Implementation and acceptance

- Exercise every lesson graph with meaningful edited input through the real session: capture entry, start, perform multiple actions synchronously, move across scenes, close, repeat at least twice. Assert restoration of model, visible geometry, controls and applicable viewport/display/selection/transient state. Prove the changed state differs before restoration and remains interactive afterward.
- Observe graph/child-board objects and relevant owned subscriptions/timers where available. Counts complement semantic observations, not replace them. Keep final-scene retention on completion and unavailable/disposed-graph behavior covered.
- Use typed, explicit graph-specific fixtures only for real state differences; avoid reflection-driven guesses for the only correctness oracle. Reuse existing observation support where credible.
- Map and migrate each unique existing English-row assertion before removing its browser repetition. Retain English rendering coverage in the chosen browser matrix and content coverage in task 3.
- Keep browser rows whose replacement relies on task 5's excluded drawing comparisons until those cases pass unfiltered. Record retained cases by name, not a blanket success claim.
- Demonstrate that temporary omitted restoration and leaked scene-resource faults fail the replacement checks, then revert them. A stubbed capability call-count assertion is insufficient.

## Verification and handoff

Run focused session/graph contract checks, typecheck, build and delegated production smoke on retained risk representatives. Report graph coverage, retained gaps, fault evidence, timings and the exact deleted-to-replacement mapping. Keep report concise and bulky logs outside the task. Final integrated suite/timing acceptance is owned by the handler under the source spec.
