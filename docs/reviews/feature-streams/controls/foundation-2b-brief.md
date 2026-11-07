# Brief: shared graph controls, task 1 slice 2b (handoff-v13)

**Role.** `bezeg-worker`, implementation and tests. Edit only the owned paths; do not commit, push or delegate. Preserve unrelated working-tree changes.

**Goal.** Finish [task 1 slice 2](../../../tasks/shared-graph-controls/01-foundation.md) on top of slice 2a (commit "feat: give unavailable controls a reason and refusals one channel"): drags refused by a mathematical rule gain a stated reason (task 0 entry 7), and the lesson path keeps the guard's single message (entry 6). Read in the [spec](../../../specs/shared-graph-controls.md): owner decisions 3 and 7, task 0 entries 6 and 7, task 1 decisions 13–16. Shared parts to use, not change: `src/inputs/RefusalChannel.tsx` (`RefusalChannel`, `RefusalNotice`), `src/graphs/base/controls/guard.ts`. `AGENTS.md` localization rule applies.

## Settled decisions

- **E-a `axisPoint`.** `BaseFunctionGraph` owns one `RefusalChannel` (created with the graph's re-render as its change callback) and renders one `RefusalNotice` in its inspector, placed once for every function graph (find where the base composes inspector commands or readouts). `axisPoint`'s `write` runs through the channel: a `DomainError` from the model puts the point back as today and shows the reason; an accepted write clears it. Drag frames repeat the same refusal without re-announcing (call `refuse(reason)` without `announce`; `guard` always announces, so do not use `guard` for drag frames). The coordinate clamp to `[min, max]` stays silent (decision 3). `ignoreOutOfDomain` itself is not changed in this slice; its 185 callers migrate in the family sweeps.
- **E-b Correlation** already owns a channel from 2a. If the base now owns one too, Correlation must use the base's channel, not a second one: exactly one `[data-refusal-notice]` per graph.
- **E-c B-spline knot markers.** `draggedKnots` (`bsplineBasisModel.ts`) returns `undefined` for an invalid candidate; give it a reason (reuse the messages `editedKnots` produces for the same rule where they exist, else add one per rule in `sl.ts`/`en.ts`). Clamping between neighbours and to `KNOT_LIMIT`, and "no change", stay silent. `BSplineBasisGraph.dragKnot` shows the reason in a `RefusalNotice` of its own channel and clears on an accepted drag or typed edit. Keep `dragKnot`'s boolean return for its callers.
- **E-d Lesson path.** A refused lesson action keeps throwing `DomainError` (entry 6). Add a test that for Correlation an add at the cap shows, in the lesson, the same text as the inspector refusal (both from `error.reason`). Do not change the lesson runtime unless the test fails.

## Owned paths

`src/graphs/functions/BaseFunctionGraph.tsx`, `src/graphs/functions/CorrelationGraph.tsx`, `src/graphs/curves/bspline/BSplineBasisGraph.tsx`, `src/graphs/curves/bspline/bsplineBasisModel.ts`, their tests, one new lesson-path test file under `src/learning/` or `src/graphs/functions/`, `src/localization/sl.ts`, `src/localization/en.ts`. Tests elsewhere that break only because an extra status region now exists: report them, do not edit, unless the fix is selecting `[data-refusal-notice]` out of a status query. Note `src/learning/playground/LookUnderneath.test.tsx` pins one live region per controls area: check whether your base notice reaches it.

## Acceptance and checks

1. A function graph with an `axisPoint` whose model refuses a value (find one: grep `axisPoint(` and pick a graph whose `write` can throw `DomainError`, e.g. an ordering rule between two bounds): a drag to a refused value shows the reason in `[data-refusal-notice]`, the point stays at the model value, an accepted drag clears it. A drag clamped at `min`/`max` shows nothing.
2. B-spline: a marker drag giving an invalid vector (for example multiplicity above k + 1) shows a reason; a neighbour clamp shows nothing; an accepted drag clears it.
3. Exactly one `[data-refusal-notice]` in the Correlation inspector.
4. E-d test.
5. Every new assertion observed failing under a mutation; logs `.command-logs/2b-mut-*.log`.
6. `just unit` on the touched directories plus `src/learning/playground/LookUnderneath.test.tsx`, then `just check-changed` (log `.command-logs/2b-check-changed.log`; it takes 30–50 min under load, so run it last, in the background, once). Smoke on port 4327 (`just smoke-built`/`just smoke-lesson`, see `docs/commands.md`; read `.agents/skills/smoke-tester/SKILL.md` and `docs/smoke-tests.md`): consumers `tests/curve-ownership.smoke.spec.cjs`, lesson rows for the graph from item 1 and any B-spline basis lesson (grep `tests/` and `src/learning/content` for `bspline-basis`), `prob-correlation`. Stop previews you start.
7. Screenshots of the item-1 and item-2 notices in light, presenting and forced colours into `.command-logs/2b-shots/`. Wait ≥800 ms after toggling `is-presenting` (button transitions) before each shot.

## Return

≤300 words: changes per file, decisions beyond E-a–E-d, mutation summary, checks with log names, gaps. Full evidence in `docs/reviews/feature-streams/controls/foundation-2b.md`; on `BUDGET HANDOFF` write it there marked partial, listing exactly which checks did not run.
