# Brief handoff-v12: Fourier series 06 F2a (epicycle graph on ADR 0040)

Two sequential workers share this brief. Your assignment names **Part M** (model) or **Part H** (graph and host). Do only your part.

- **Role:** implementation and test worker; edit permission in `.claude/worktrees/stream-functions`. Do not commit, push, stash or delegate. Edit `sl.ts`, `en.ts` only with targeted Edit calls. Do **not** run `just build`, `just preview` or any smoke; `just typecheck`, `just lint` and path-filtered `just unit` are fine.
- **Goal:** `docs/tasks/fourier-series/06-batch-c.md` steps 2 and 3: a pure model and an `EpicycleGraph` for lesson F5, unmounted. No route, no catalog entry, no lesson text: those are F2b onward.
- **Sources:** `docs/specs/fourier-series-lessons.md` §F5 (read only that section), [ADR 0040](../../../../adr/0040-epicycle-rendering.md), ADR 0034 §4.
- **Patterns to copy:** `src/analysis/fourierCoefficientsModel.ts` (strict `check…`/`parse…`, edit functions returning `{ok, model}` or a reason, no silent rounding), `src/graphs/functions/FourierCoefficientsGraph.tsx` with `fourierCoefficientsMessages.ts` and its host test. Kernel: `src/analysis/closedSpline.ts`. The other Fourier graphs, routes and Presets stay untouched.

## Settled decisions

- **Model** `src/analysis/epicycleModel.ts`: `vertices: LoopPoint[]` (\(m\) points), `spans` (\(m\) entries, span \(i\) runs from vertex \(i\) to vertex \((i+1)\bmod m\), each `{kind: 'line'}` or `{kind: 'cubic', c1, c2}`), `N`, `parametrization`. The model owns each vertex once, because `validateLoop` compares only the first and last point: a stored span list could hide a broken interior joint. `epicycleLoop(model)` builds the kernel's `ClosedLoop`, with the first end point equal to the last by construction.
- **Validity:** \(4\le m\le 8\); every coordinate finite and in \([-3,3]\); `N` integer in \(0..50\) (`EPICYCLE_MAX_N`), default \(5\); `parametrization` `equal` (default) or `chord`. A degenerate loop (all points equal) is valid. Out-of-range input is rejected with a reason, never clamped. Imports accept any finite in-range value, so \(\kappa\) survives exactly; drags and keyboard steps snap to \(0{,}05\) (Shift \(0{,}5\)).
- **Examples**, a closed list `circle`, `diamond`, `uneven`. Default `circle`.
  - `circle` and `diamond` use the spec's coordinates exactly, so its numbers hold.
  - `uneven`: six cubic spans, on-grid points, longest chord at least three times the shortest. All the symmetric examples have equal chords, so the parametrization switch only shows a difference here.
  - The example is **not stored**: `matchEpicycleExample(model)` derives it, or `undefined` after an edit. Choosing an example resets the loop and keeps `N` and the parametrization.
- **Edits:** moving a vertex moves its two adjacent cubic controls by the same delta; if that puts any point out of range, the whole edit is rejected. Moving a control moves only that control, so corners are allowed.
- **Coefficients and trace** are recomputed when the loop or parametrization changes, always up to `EPICYCLE_MAX_N`, so an \(N\) change costs no quadrature. `chord` may report `fellBack`; the host shows that as a visible hint.
- **`traceSum` cost.** It calls `epicycleChain` per sample, which re-sorts all terms: 2000 sorts per drag. ADR 0040's harness did not pay this. Compute the order once per trace. The sum order must stay the same, so results do not change.
- **Time** `t` in \([0,2\pi)\) and the playing flag are host state, not model fields, and not stored in Presets. Import, an example change and reset give \(t=0\), stopped.
- **Lesson actions** (for later slices): `function-choice` `epicycle-example`, `epicycle-parametrization`; `function-parameter` `epicycle-n`, `epicycle-time`, `epicycle-vertex-<i>-x|y`, `epicycle-control-<i>-<1|2>-x|y`. One synchronous sequence must work (AGENTS.md lesson-scene rule).
- **Terms:** *epicikel*, with the prose "vrteči se krogi"; *parametrizacija* (`docs/reviews/fourier-series/terms-research.md`). Others per `docs/localization.md#choosing-new-terms`; list what you chose and why.

## Part M: model and kernel

Files: `src/analysis/epicycleModel.ts` with its test, and the `traceSum` change in `closedSpline.ts` with its test. No graph, no catalog keys beyond what the model needs (it should need none: it returns reasons).

Besides the above, export `maxTraceError(loop-derived samples)`: \(\max_j|z(t_j)-S_N(t_j)|\) over the same 2000 samples as the trace.

Checks:

- Defaults, every rejection reason, a round trip, the strict parse, the vertex-delta rule with its out-of-range rejection, `matchEpicycleExample` before and after an edit.
- Spec numbers to 6 decimals through the model: `circle` \(c_1,c_5,c_{-3},c_{-7},c_9\); `diamond` \(c_k=8/(\pi^2k^2)\) to \(10^{-10}\). `maxTraceError` to \(10^{-4}\): `circle` \(N=1\) \(0.007346\), `diamond` \(N=1,3,5,9\) \(0.18943,0.09937,0.06694,0.0404\). If a value misses, report it; do not widen the tolerance.
- Coefficients taken at `EPICYCLE_MAX_N` agree with `loopCoefficients(loop, N)` to \(10^{-12}\) for \(k\le N\).
- `uneven`: `equal` and `chord` differ in \(|c_1|\) by at least \(0{,}01\). A degenerate loop gives \(c_0\) only and a finite trace.
- `traceSum` output equal before and after the change, compared against a per-sample `epicycleChain` loop, including ties.
- For each new regression assertion, an observed failure against a deliberate mutation (at least three).

## Part H: graph and host

Files: `src/graphs/functions/EpicycleGraph.tsx`, `epicycleMessages.ts`, its host test, a small css file if needed, and `sl.ts`/`en.ts` keys. Register a factory only if the host test needs it; a route is F2b. The model is accepted; do not change its results.

- **Board objects (ADR 0040):** one curve for the arm chain, one NaN-separated curve for all circles (48 points each), one trace curve of 2000 samples, one original-loop curve, a control-polygon curve, and the handles. All regenerate in `updateDataArray`. An \(N\) change changes data only. Handles depend on the loop, never on \(N\). The graph owns and disposes them all.
- **Equal unit lengths on both axes**, or the circles are not circles. Initial view about \(\pm3{,}2\). Check it in a test.
- **Trace rule:** at \(t=0\) and stopped, the whole trace, so the partial sum can be compared with the loop; otherwise sliced to the part up to \(t\).
- **Handles:** vertices and cubic controls, visually distinct, each draggable and keyboard operable with named labels. A rejected drag leaves the handle at the last valid position and shows the reason.
- **Inspector:** example select (shows a custom state after an edit); an `N` slider with large step buttons; a visible hint that \(N\) is capped at 50 (visible at the cap); the parametrization switch; play/pause and a time slider; a visible hint when `chord` fell back; a key for chain, circles, trace and loop.
- **Playback:** stopped by default; one period in about 10 s from frame timestamps, not frame counts. Inject the frame driver as `src/graphs/patches/BaseSurfaceGraph.tsx` does, so tests advance it by hand. It pauses on any edit (drag, \(N\), example, parametrization), on import, on lesson exit and on unmount, with no frame left pending.
- **\(|c_k|\) table:** frequencies in chain order with \(|c_k|\), decimal commas, scrolling within the inspector at 101 rows. It is the accessible alternative too.
- **Text status** (a live region that does not announce every frame): \(N\), the number of terms, the largest term, and the sampled trace error.
- **Presets** (task step 3): export and import of loop, `N`, parametrization through the parse function; a malformed file gets an actionable message.

Checks, in the host test:

- A vertex and a control drag or keyboard step change the table and status.
- Board-object count created at \(N=1\), \(N=50\) is identical, and everything is disposed on unmount (a leak assertion, not just "no throw").
- Playback is stopped by default, advances with a manual driver, and pauses on each trigger above; unmount cancels the pending frame.
- Preset round trip keeps the loop, \(N\) and parametrization; a malformed Preset is rejected; the language switch keeps the scene; a multi-action lesson sequence in one tick.
- For each new regression assertion, an observed failure against a deliberate mutation (at least three).

## Checks and return

`npx tsc --noEmit --pretty false`, eslint on touched files, `just unit src/analysis src/graphs/functions src/localization`, with logs to files under `C:/Users/1337Hacker/.claude/jobs/cb986187/tmp/fourier-f2a/`.

Return at most 300 words: files, decisions you had to make (flag any contradiction with the spec or ADR), terms chosen, check results with log paths, mutations, open questions.

Budget: grep before reading, at most 150 lines per read, never a whole file over 300 lines. On `HANDOFF` or after about 30 turns, write a note to `docs/reviews/feature-streams/functions/worker-fourier-06-f2a-handoff.md` and return partial.
