# Functions stream: handler handoff 4

Handler 4 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-10-31, at the 150k soft threshold. The supervisor started this handler after handler 3's session ended.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`. The `node_modules` junction points to the main install; delete the junction before removing the worktree.
- **Pushed to `master` at `16a478a`:**
  - school-function-graphs kernel 03 accepted. The full `just unit` passed apart from two `PresetCatalog.test.tsx` failures that master had at the time and that master fixed in `57756e6`;
  - family 3 ADR renumbered **0031 → 0033**, because master already had 0031 (probability) and 0032 (linear maps);
  - family 4 F0: [tasks](../../../tasks/fourier-series/README.md), [ADR 0034](../../../adr/0034-fourier-series-models-handles-and-closed-loop.md), terms settled, spec marked scheduled;
  - projective task 01 (homogeneous kernel) accepted after math review. It records the sign convention in the [task README](../../../tasks/projective-conics/README.md#conventions-fixed-by-the-kernels).
- **Committed locally, not on `master`** (also pushed to `origin/stream-functions-h4`):
  - `20fec43`, projective task 02 (conic kernel, pencil parameter, Pascal). Math review: no must-fix. Two should-fixes are still open (below);
  - `491a070`, Fourier task 01 (coefficient kernel). Its worker checks passed; it is **not yet reviewed**.

## Remaining steps, in order

1. **Projective 02 repairs**, then accept:
   - `conic.ts:200` `classify`: a conic containing the line at infinity, for example `conic(0,0,0,1,1,0)` (= \(w(x+y)\)), returns `parallel-lines`. Projectively it is a real line pair through an ideal point. Decide (recommended: `line-pair`, or document `parallel-lines` as the affine reading), state it in the doc comment, and pin it with a test.
   - Add an independent `classify` cross-check: an exhaustive loop over small coefficients in \([-2,2]\) checked for consistency (a `point` conic has exactly one real zero; an `empty` conic has no sampled rational zero; and so on).
   - Notes, optional: test `s` for an ideal \(Q_0\) and for \(w_0\ne1\) (`conicPencil.ts:70`); `approxPoint`'s 1e-9 tolerance is untested at the edge of its range.
   - The direction table uses `DIRECTION_BOUND = 14`, not the spec's 256 entries with \(|p|,|q|\le64\). Task 05's drag measurement fixes the size (ADR 0033 §2).
   - Then run the full `just unit` once, set 02 to accepted, update stream row 3, and push.
2. **Fourier 01 math review** (`bezeg-reviewer`, Sonnet `medium`). Points to check:
   - The worker splits every piece into panels no wider than \(\min(\pi/2,2\pi/k)\). A plain 16-node rule per piece missed the spec's own tolerances at high \(k\), at \(N=1001\), and for \(1/(2-\cos x)\). The breakpoints stay panel boundaries, and `integratePiecewise` is unchanged. Record this in task 01 or ADR 0034 when accepting.
   - Shift identity tested as \(c_k(f(x-\tau))=e^{-ik\tau}c_k(f)\). This is consistent with the spec's \(e^{ik\tau}\) for moving the loop's start (\(z(t+\tau)\)), so task 02 should test the start-shift form.
   - The pitfall test calls `integratePiecewise` with one panel. The test that fails when splitting is removed is "kernel gets the jump right".
   - `gaussLegendre` is imported from `src/bezeg/impl/kernels/arc-length.ts` (precedent: `subdivision.ts`).
   - After review, run the full suite, accept, set stream row 4, and push.
3. **Projective 03** (sampler) and **04** (five-point solver, `high` effort), then **05**, the Batch A graphs (ungated).
4. **Fourier 02** (closed loop and epicycle chain kernel).
5. **Wait on the gates.** When only gated work is left, set `Run state: waiting on G-FN, G-REG`, push, and end.

## Owner decisions and risks

Carried over from handoff 3: `TRANSFORM_BOUNDS`/`POLY_BOUNDS` unconfirmed; decimal-comma localization in graph and lesson slices; ε=0 routed to `circleConic`; *pol* always paired with *polara*; thin sources for *šop premic*, *središčna projekcija*, *Pappusov izrek* and the Fourier wave names; the quotient-rule LaTeX assertion belongs in family 2's task 06.

New:
- **ADR numbers race:** check `git ls-tree --name-only origin/master docs/adr/` before every new ADR.
- **Machine load:** full `just unit` waited about 7 minutes for a slot.

## Gaps

- No `do-log` evaluation records for this session's delegations (all `bezeg-worker`/`bezeg-reviewer`, Sonnet `medium`):
  - projective 01 worker, about 43k tokens. Its mutations were adequate. The review found two should-fixes, which the handler repaired;
  - projective 01 review, about 26k;
  - projective 02 worker, about 92k;
  - projective 02 review, about 39k, with two should-fixes;
  - Fourier 01 worker, about 64k. Records for handlers 2 and 3 are also still missing.
- The full suite has not run on `20fec43` or `491a070`.

## Settings to keep

- **Successor:** `--agent claude --model opus --permission-mode auto --effort medium`.
- **Workers and reviewers:** `bezeg-worker` and `bezeg-reviewer`, Sonnet `medium`.
- **Smoke port:** 4315.
