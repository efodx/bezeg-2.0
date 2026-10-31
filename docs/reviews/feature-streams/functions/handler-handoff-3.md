# Functions stream: handler handoff 3

Handler 3 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-10-31, after passing the 150k soft threshold.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`. The `node_modules` junction points to the main install, so delete the junction before removing the worktree.
- **Committed locally and pushed only to `origin/stream-functions-h3`, not `master`.** This branch holds three commits on top of `master`:
  - the task 03 WIP kernel commit;
  - the S4 spec decision. The horizontal example is now \(2(x-1)(x+1)/((x-2)(x+2))\), equal to 2.0625 at \(x=10\);
  - family 3 F0 (73d8e8f): [tasks](../../../tasks/projective-conics/README.md), [ADR 0031](../../../adr/0031-projective-conics-exact-kernel-and-family.md), terms settled, spec marked scheduled;
  - the task 03 review repairs, with this note and the research files ([review](../../school-function-graphs/03-polynomial-rational-math-review.md)).
- **Checks at the repair commit.** `just typecheck` passed. `just unit src/analysis` passed, and the mutation check was observed. The full `just unit` run waited about 23 minutes for a test slot behind `stream-maps`. It had just started when Claude Code stopped it because the system was low on memory, so it has **not run** on these commits.

## Remaining steps, in order

0. **Finish task 03.** Run the full `just unit` once on this branch. If it passes, set task 03 to `accepted` in `docs/tasks/school-function-graphs/README.md` and in stream row 2. Then fetch, rebase onto `origin/master`, recheck, and `git push origin HEAD:master`.
1. **Family 4 F0 (Fourier series).** Use the [spec](../../../specs/fourier-series-lessons.md).
   - Write ADR 0032 for its four decisions. The spec recommends: (1) a Fourier-specific Gibbs graph, leaving `UniformConvergenceGraph` and its Presets untouched; (2) piecewise-linear handles with fixed breakpoints; (3) epicycle rendering, decided after measurement in Batch C; (4) a pure closed loop of Bézier spans, not an extension of `BezierSpline`.
   - Before using 0032, check `git ls-tree --name-only origin/master docs/adr/`: other streams take ADR numbers too, and 0031 was free at this push.
   - Create `docs/tasks/fourier-series/`: the coefficient kernel (F1, ungated); a closed-spline/epicycle-chain kernel (F1, ungated); then Batches A, B and C with `G-FN`/`G-REG`. Batch C's ADR must cite measured frame times.
   - Settle the terms from the research file: *Fourierova vrsta*, *delna vsota* (already in `analysisGuidedLessons.ts`), *Fourierov koeficient*, *amplitudni spekter*, *Gibbsov pojav* (with *Gibbsov fenomen* glossed once, from a UL FMF seminar title), *točkovna/enakomerna konvergenca*, *epicikel* (with *vrteči se krogi* in prose), *parametrizacija*, *pravokotni/žagasti val* (unsourced, gloss once), *skok*.
   - Mark the spec scheduled and update stream row 4.
2. **Family 3 kernels**, in task order: 01 homogeneous kernel, 02 conic kernel, pencil parameter and Pascal, 03 sampler, 04 five-point solver (at `high` effort). Then **05, the Batch A graphs**. They are ungated: they add no function model and no curve object.
3. **Family 4 kernels** (coefficients, closed loop).
4. **Wait on the gates.** When only gated work is left, set `Run state: waiting on G-FN, G-REG`, push, and end.

## Owner decisions and risks

- **Unconfirmed bounds:** `TRANSFORM_BOUNDS` and `POLY_BOUNDS` (worker choices; the spec gives no ranges).
- **Decimal points:** the graph and lesson slices must localize decimal points to `{,}` and a decimal comma.
- **ε=0:** this case must be routed to `circleConic`.
- **"Pol" clash:** family 3 always writes *pol* together with *polara* or *glede na stožnico*, because family 2 uses *pol* for the pole of a rational function.
- **Unsourced terms:** *šop premic* (chosen over *snop*), *središčna projekcija*, *Pappusov izrek* and the Fourier wave names. Their sources are thin; see the research files.
- **Coverage gap:** the quotient-rule LaTeX of the rational derivative has no exact-text assertion. Add one in family 2's task 06 graph slice.
- **Machine load and ADR-number races:** both still stand.

## Gaps

- No `do-log` evaluation records exist for this session's two delegations or for handler 2's seven:
  - task 03 review: `bezeg-reviewer`, Sonnet `medium`, about 37k tokens; 3 should-fix findings, all repaired;
  - term research: `general-purpose`, Sonnet, chosen because it needed web tools; about 61k tokens. Search tooling was weak, and Termania and textbooks were not reached.

## Settings to keep

- **Successor:** `--agent claude --model opus --permission-mode auto --effort medium`.
- **Workers:** `bezeg-worker`, Sonnet `medium`.
- **Reviews:** `bezeg-reviewer`, Sonnet `medium`.
- **Smoke port:** 4315.
