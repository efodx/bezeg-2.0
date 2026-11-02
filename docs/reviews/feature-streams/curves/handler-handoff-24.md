# Curves stream: handler handoff 24 (PC switch)

Handler 24 wrote this on 2026-11-02, replacing [handoff 23](handler-handoff-23.md). The owner asked every stream to stop for a move to a new computer, so the stream file says `Run state: stopped`. The new-PC setup sets it back to `active`. Do not start a successor until then.

## State

- Nothing is in flight: no workers, preview servers or temporary worktrees.
- No WIP branch. The handler's working tree was clean, and its branch `worktree-stream-curves` held nothing beyond `master`. Nothing was left uncommitted or skipped.
- Settings are unchanged from handoff 23. Handler: Opus, `--permission-mode auto`, `--effort medium`. Workers, reviews and smoke: `bezeg-worker`, `bezeg-reviewer` and `bezeg-smoke` on Sonnet `medium`.
- Test slots get recalibrated on the new machine, and `BEZEG_TEST_SLOTS` and `BEZEG_TEST_WORKERS` may differ. Earlier runs had low-memory kills, so run heavy checks in the foreground, one at a time.

## Done this session

1. **CI for the IA-A-3b lesson push.** Run `41449127670` at `c3e32dfb` was **cancelled**, not run: later docs-only pushes from other streams superseded it. Those later runs passed in about 30 s and do not run the full suite. The combined tree therefore has no full verification yet, local or hosted (see below). The successor confirms that the next full hosted run on `master` is green.
2. **BS-A-6 gate: audit and `just check`.** Each Batch A criterion maps to an existing test:
   - Kernel: basis, golden numbers, support, Bernstein equivalence, validation, de Boor, local control, convex hull and degree 0 are in `src/bezeg/impl/curve/bspline/bspline-kernel.test.ts` and `src/bezeg/impl/curve/bspline-curve.test.ts`.
   - ADR 0024 is accepted (2026-10-31).
   - Curve object DTO round-trip, including weights, and disposal: `src/graphs/curves/object/JXGBSplineCurve.test.ts`.
   - Preset collection round-trip, and each rejection reason in SL and EN (`it.each`): `src/graphs/curves/bspline/bsplinePresetCollection.test.ts`.
   - L1 acceptance criteria 1–6: `BSplineBasisGraph.test.tsx` and `bsplineBasisModel.test.ts`.
   - L2 acceptance criteria 1–5: `DeBoorGraph.test.tsx` (iteration lifecycle, disposal, convex hull, P0 locality).
   - `just check` at `c3e32dfb` was started but **not completed**. It ran over 10 minutes without output, then was stopped for the PC switch. The audit is done, but no check result exists: rerun `just check` on the new PC.

## Next steps, in order

1. **Finish BS-A-6.** Rerun `just check` alone and fix any failure. Then run browser smoke of `/bspline/basis`, `/bspline/deboor` and `/learn/b-splines` in SL and EN with the live switch, through a `bezeg-smoke` worker against a preview. After that, confirm a full hosted CI run, record the gate in `docs/tasks/b-splines-nurbs/README.md` (row BS-A-5…6), and update the stream status line.
2. **I4 least-squares graph** (`G-FN`, IA-B-*), then the family 4 graphs, per handoff 18.
3. **Interpolation chapter (F4).** Move the I1, I2, I3 and I5 lessons out of the interim owner `bezier-curves/geometric-properties` (`guidedLessonOwnership.ts`).
4. **Deferred, low priority:** these items carry over unchanged from [handoff 23](handler-handoff-23.md#next-steps-in-order). On `interp-runge` at 390 px the node-rule label is clipped, and at 200% text the function select is truncated. IA-A-2c's help-element ids are fixed. Handoff 21 item 5.

## Evaluation record

Handoff 23's evaluation record is still not logged with `do-log`. Log it from [handoff 23](handler-handoff-23.md#evaluation-record-not-yet-logged-with-do-log). This session dispatched no workers.

## Successor prompt

Continue docs/tasks/feature-streams/curves.md from docs/reviews/feature-streams/curves/handler-handoff-24.md under AGENTS.md.
