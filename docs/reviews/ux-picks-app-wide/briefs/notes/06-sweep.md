# 06 slice 5 sweep: worker note

Done. Files: src/workspace/sweep/{sweepModel,sweeps,useSweep}.ts (+ sweeps.test.ts, sweepPuck.test.tsx, sweepPreview.test.tsx); PuckParts.tsx (SweepButton, useHold, headExtra); RangePuck/CountPuck (sweep, onHold props); ParameterPuck.tsx; pucks.css; workspace-pucks.ts (`puck_sweep`); graphDeclaration.ts (RangeParameter.sweep).

Checks: unit 38 files, 430 passed, 9 skipped; tsc clean; lint passed; browser log 06-sweep-browser.log (script 06-sweep-browser.cjs).
Mutation check (hold removed, reduced-motion check removed) failed the grab and reduced-motion tests: 06-sweep-mutation.log.

Open: marks-aware shrink of the swing (follow-up); feel (25 %, 4 s, 600 ms, reduced motion = no button); sweep button position (label row, left of "?"); hold on pointer down only for range pucks (count has no drag).

## Review fixes (worker, observed)
- P1 sweep halfWidth/period: checkDeclaration problem, planRangeSweep default fallback, non-finite guard in sweeps.ts ends the sweep. Red: 3 failed (06-fix-red1.log).
- P2 RangePuck: onLostPointerCapture/onBlur end the drag as cancelled, endDrag idempotent. SweepButton stop glyph (data-glyph). Red: 2 failed (06-fix-red2.log).
- P2 .puck-sweep 24x24, margin-block -3px keeps row height.
- Green: just unit src/workspace src/graphs/base/declare passed; tsc clean; just lint passed.
- Shot: smoke/06-sweep-strip-310.png (170x425, Taylor strip, not judged).
