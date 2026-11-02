# 08 F2a graph repair handoff (partial, stopped on HANDOFF)

All edits are uncommitted in worktree stream-maps. Last full run: `just unit src/compgeo/inversion src/graphs/compgeo/Inversion src/graphs/compgeo/inversion src/localization` passed.

| # | Status | Notes |
|---|---|---|
| 1 edgeMarker | done | `inversionView.ts` edgeMarker takes `place`; new `inversionView.test.ts` (4 tests, pass; fail under mutation) |
| 2 refreshView | done | `InversionGraph.tsx` viewKey/refreshView(settled); rebuild only on outside-set change while panning, box-sensitive on `up`; also fixed stale key (keys recorded in drawImage). Host test passes. X' is drawn whenever in cap (flip is only for the marker) |
| 3 nested unknown keys | done | `inversionPresetCollection.ts`; 6 tests, fail (6) under mutation |
| 4 P1 label | done, no fix needed | new host test passes |
| 5 weak assertions | done | per-overlay test.each; dispose test asserts old board's boundingbox/up listeners gone. Old points' own drag handlers still reach the graph after unmount (not fixed; base-class behaviour) |
| 6 angle tangents | done | half-length 0.07*box width, no after-tangent without `image.board`; angle focus also rebuilds on `up`; host test fails under mutation |
| 7 Shift+arrows | done | InversionPanel IntField and theta; host test passes, pre-fix failure not observed |
| 8 locale | done | sl.ts 2150, 2154, 2189; host expectation updated; en unchanged |

Remaining: `just lint` on changed files not run; tsc was fixed (one tuple type error in the host test) and is clean; browser smoke not done.

## Handler confirmation (maps handler 20, 2026-11-02)

- Sonnet engineering re-review of repairs 1, 2 and 6: confirmed (edge marker, listener ownership via `session.on` cleanup, angle tangents). Ownership of every scene object confirmed.
- New finding accepted and fixed: a wheel or button zoom fires no pointer `up`, so the view never settled. `InversionGraph.tsx` now also settles 150 ms (`VIEW_SETTLE_MS`) after the last `boundingbox` event; the timer is cleared on `up`, board replacement and unmount. New host test "a zoom with no pointer up ..." fails when the timer is disabled (`expected +0 to be 1`).
- Not fixed (low): with the `image` overlay off the view keys are written only by `refreshView`, so one extra resync can follow a state change. Correct, cheap.
- Item 7 pre-fix failure observed: with the Shift handlers removed the Shift+arrow test fails (`expected 2 to be 8`).
- Checks after the fix: focused unit, tsc, lint passed; full `just unit` passed at `9d794208` (before the zoom fix); `just build` passed after the repairs.
