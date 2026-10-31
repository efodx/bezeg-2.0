# Functions stream: handler handoff 2

Handler 2 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-10-31, after passing the 150k soft threshold.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`. The `node_modules` junction points to the main install, so delete the junction before removing the worktree.
- **Accepted and pushed to `master`.** The full `just unit` run and `just typecheck` passed on these commits:
  - a574bc3, the root-finding convergence fix (`root-found` within 4 ulps). Numerical-methods kernels 01–03 are accepted ([review](../../numerical-methods/kernels-01-03-math-review.md)).
  - 50e95ad, family 2 task 04: geometric series and conics ([review](../../school-function-graphs/04-series-conic-math-review.md)).
  - c2109a2, family 2 task 01: catalogue core ([review](../../school-function-graphs/01-catalogue-core-math-review.md)).
  - 5cc3272, family 2 task 02: transformation and inverse kernels ([review](../../school-function-graphs/02-transformation-inverse-math-review.md)).
- **Pushed only to `origin/stream-functions`, not `master`.** The WIP commit for family 2 task 03 (polynomial and rational) holds `polynomial.ts`, `rational.ts`, their tests, and the `poly`/`rational` edits in `schoolFunctions.ts` and its test. The worker's focused runs and tsc pass, and the full suite in this session ran with these files present. It has had no review yet.

## Remaining steps, in order

1. **Settle the S4 contradiction.** The spec's S4 check \((2x^2+1)/(x^2-1)=2.0303\) at \(x=10\) cannot be written in product form, because \(2x^2+1\) has no real zeros. The worker tested \(2x^2/(x^2-1)\) instead, which gives \(200/99\approx2.0202\). There are two options:
   - **Change the spec example.** Pick another rational function with the same lesson point: horizontal asymptote 2, equal degrees.
   - **Extend the product form.** Allow an irreducible quadratic factor, which changes the union, the validator, the text and the degree count.

   Changing the example is the bounded choice and keeps ADR 0026's product form intact. Decide, record it in the spec, and adjust the test.
2. **Review task 03.** Run a mathematical and engineering review with one `bezeg-reviewer` (Sonnet `medium`). Check that the worker's LaTeX survived the backslash-collapse quirk, which it reported fixing. Also check:
   - the hole and pole multiplicity rules;
   - the quotient rule on the reduced fraction;
   - the asymptote helper;
   - its decisions: merged multiplicity above 3 is rejected, `POLY_BOUNDS` (k in ±10, zeros in ±20), `k=0` rejected as `excluded-value`, and the now-unused `unsupported-kind` reason.

   The worker did not mutate the "no plot piece spans a pole" test.
3. **Repair, accept and push.** Repair the findings, then run the full suite and typecheck once. Set task 03 to accepted in `docs/tasks/school-function-graphs/README.md`. Squash nothing; add a fix commit on top of the WIP commit. Push to `master`.
4. **Start F0 for families 3 (projective conics) and 4 (Fourier series), then their kernels.** These are ungated. Family 3 can use `conic.ts` from task 04.
5. **Wait on the gates.** `G-REG` and `G-FN` are still closed. When only gated work is left, set `Run state: waiting on G-FN, G-REG`, push, and end.

## Owner decisions and risks

- **Unconfirmed bounds.** The workers chose these because the spec gives no slider ranges: `TRANSFORM_BOUNDS` (a, b in ±10; c, d in ±20) and `POLY_BOUNDS`.
- **Decimal points.** The LaTeX and plain forms in `schoolFunctions` print decimal points. The graph and lesson slices must localize numbers to `{,}` and a decimal comma.
- **ε=0.** `conicFromFocusDirectrix` throws for \(\varepsilon=0\). The scene must route that case to `circleConic`.
- **Machine load.** The full unit run queued for about 40 minutes behind the `stream-maps` stream. Only one test slot is available at 16 GB.
- **ADR numbering.** The risk that ADR numbers race across streams still stands (see [handoff 1](handler-handoff-1.md)).

## Gaps

- No evaluation record (`do-log`) was written for this session's seven delegations (3 workers, 4 reviews). Each review's record notes the models used and the repairs.

## Settings to keep

- **Successor:** `--agent claude --model opus --permission-mode auto --effort medium`.
- **Workers:** `bezeg-worker`, Sonnet `medium`.
- **Reviews:** `bezeg-reviewer`, Sonnet `medium`.
- **Smoke port:** 4315.
