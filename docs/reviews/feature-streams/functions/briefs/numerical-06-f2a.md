# Brief handoff-v12: numerical methods 06 F2a (quadrature Demonstration graph for N4)

- **Role:** implementation and tests; edit permission in the stream worktree `.claude/worktrees/stream-functions` (branch `stream-functions`). Do not commit, push or delegate. Another worker is concurrently editing `src/graphs/projective/`, `src/graphs/base/presets/PresetImport.ts` and the `projective_five_point_*` locale block: do not touch those, edit `sl.ts`/`en.ts` only with targeted Edit insertions (never rewrite the files), and ignore type errors that originate in `src/graphs/projective/`.
- **Goal:** the quadrature graph (F2a only: no route, no catalog entry, no Demonstration registration, no lesson). Source: N4 in `docs/specs/numerical-methods-lessons.md` (graph needs, acceptance 1, 2, 3, 5, 6), `docs/tasks/numerical-methods/06-batch-b.md` (F2a), ADR 0023 §3 (separate Demonstration; `SUM_METHODS` and `DefiniteIntegralGraph` stay unchanged).
- **Pattern to copy:** the Batch A F2a slice `src/graphs/functions/RootFindingGraph.tsx`, its tests (`RootFindingGraph.test.ts`, `RootFindingGraph.host.test.tsx`), its messages module and its Preset parser/collection (find it with `grep -rl RootFinding src`): board ownership and disposal, language switch, keyboard, Preset validation with actionable errors. Kernel to use, not change: `src/analysis/quadrature.ts` (`simpsonRule`, `simpsonParabolas`, `trapezoidRule`, `absoluteError`, `errorRatio`, `SIMPSON_N_*`, `isSimpsonCount`), plus the function catalogue the root-finding graph uses.

## What to build

- `QuadratureGraph.tsx` (+ controls, messages/text module as the pattern has) under `src/graphs/functions/`: rule `trapezoid | simpson`, catalog function, interval [a,b], `n` within the existing 1…150 bound. For Simpson only even `n` is offered (step 2); switching trapezoid→Simpson with odd `n` is handled with a clear message or a visible, stated adjustment, never silent rounding (acceptance 3). Draw the function, the trapezoids (trapezoid rule) or one parabola overlay per subinterval pair (Simpson). Readouts: approximation, exact value (from the catalogue's antiderivative/exact integral; if none, say so), absolute error, and the ratio to the error at `n/2` (equal to the quotient of the two displayed errors, acceptance 1; none when `n/2` is not valid for the rule).
- Default example `sin` on [0, π], trapezoid, n=2. Tests must reproduce N4's numbers to 4 significant digits: trapezoid errors 0.4292, 0.1039, 0.0258 (n=2,4,8), 0.00643 (n=16), ratios 4.13, 4.03; Simpson errors 0.0944, 0.00456, 0.000269, 1.66e-5 (n=16), ratios 20.7, 16.9, 16.2. `square` on [0,3] with Simpson: error < 1e-12 against the exact antiderivative (acceptance 2; also a cubic if the catalogue has one).
- Preset type (e.g. `quadrature`) with a parser that validates rule, function id, interval and `n` (even for Simpson) with actionable errors; register it in the Preset import list only if the root-finding slice did so in F2a (check its history with `git log --stat -- <root finding parser file>`), otherwise leave registration for F2b and say so.
- Locale: one `quadrature_*` (or the pattern's prefix) block placed after the root-finding keys in both `sl.ts` and `en.ts`, lockstep. Slovenian terms: `docs/tasks/numerical-methods/README.md` §terms and existing keys (trapezno pravilo, Simpsonovo pravilo — grep first); a genuinely new term follows `docs/localization.md#choosing-new-terms` and goes in your report. Decimal commas in Slovenian readouts as the existing graphs do.

## Checks

- `npx tsc --noEmit --pretty false` (ignore errors only from `src/graphs/projective/`), `npx eslint` on touched files.
- `just unit src/graphs/functions src/analysis src/localization` (adjust to where tests live). Never bare `npx vitest`; not the full suite.
- Host test: mount, change n by keyboard/control, rule switch with odd n, function switch, language switch updates board text and readouts, Preset import and Reset restore controls and board, unmount leaves no board objects. Existing `DefiniteIntegralGraph` tests still pass unchanged.
- Mutation evidence for at least four new assertions (wrong ratio denominator, odd n accepted for Simpson, parabola overlay off by a subinterval, invalid Preset accepted, language switch not applied): mutate, observe the failure, revert.

## Return

≤ 400 words: files changed, checks with log paths, mutation evidence, computed example numbers, new terms, deviations as `file:line`, open questions. Logs go to `C:/Users/1337Hacker/.claude/jobs/122d72dc/tmp/n06/`, never `docs/`.

Budget: locate with `grep -l`/`-c` before reading; read ≤ 150 lines per call; send test and lint output to log files. On a `HANDOFF` message, or after about 30 turns before acceptance, stop at a consistent point, write state, remaining steps, touched files and checks to `docs/reviews/feature-streams/functions/worker-numerical-06-f2a-handoff.md`, and return as partial.
