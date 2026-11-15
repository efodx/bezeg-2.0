# F3 level-sets Batch B slice 1: contour-map scene actions and opening probe

## Written
- `src/learning/model.ts` (levelsets union): `set-mode {mode}`, `set-function {fn}`, `set-level {level?, levelCount?}`, `set-probe {X, Y}`, `set-numeric {numeric}`.
- `src/graphs/levelsets/ContourMapGraph.tsx`: `applyLevelSetsAction`, `commitContour`, `registerLessonActions` (after `setCircleStep`). Merge, `parseContourState` before any write, unknown fields refused, only changed fields written in one `edit`, a valid no-op action still halts playback. `set-function` uses `withFunction` (same probe fallback as the chooser). Refuses `set-objective/-constraints/-sweep`.
- `src/graphs/levelsets/LinearProgramGraph.tsx`: refuses the five contour ops (`levelsets <op>: this operation belongs to the contour-map graph.`).
- Tests: new `ContourLessonActions.host.test.tsx` (6 tests); LP host test extended with the refusals.
- Logs in `.command-logs/ls-b/`: `host-red.log` (6/6 failed with the registry line commented out), `host.log` (green), `s1-unit.log` (src/graphs/levelsets green), `s1-tsc.log` (clean), `s1-lint.log` (clean), `probe.txt` (sl then en, 25 scenarios each).

## Observed
- Level rows: count n spreads levels from c upward in equal steps: bowl count 3 draws c = 1, 2, 3 ("od 1 do 3 v korakih po 1"); saddle at 0 count 3: 0, 1, 2; hills c = 1 count 5: 1, 1,125 ... 1,5 (step 0,125).
- Probe moves: `probe-f` row ("Vrednost f v sondi") follows (0,6; 0,8) -> 1, (1; 0,5) -> 1,25; the dashed "through" contour is drawn at c = f(p) (legend row, no readout of its own).
- Valley c = 1: length 4,4081; probe (0,6; 0,8) f = 6,76.
- Saddle c = 0: length 11,3137, status is the generic "nivojnica pri c = 0", it does not name the crossing lines.
- Hills at c = 1 (the default level) draws nothing (length 0, max of sin x sin y is 1): lessons must set a level below 1.
- Gradient: bowl probe (1,2; 1,6), tangent (-0,8; 0,6), dot 0, status "pravokoten je na nivojnico". Valley (2; 0) -> (4; 0), tangent (0; 1); (0; 1) -> (0; 20), tangent (-1; 0). Hills (1; 1) -> (0,4546487; 0,4546487), numeric (0,4546411; 0,4546411), error 0,0000076 (status adds the error sentence).
- Gradient is zero (status "gradient ničeln; tangente nivojnice ni", gradient/tangent rows "ničeln"/"ni določena") only at (0; 0) on the bowl, saddle and hills.
- Numeric toggle appears only in gradient mode (control), the action sets it in any mode; it adds rows `numeric`, `numeric-error` and the status sentence.
- Surface panel renders with a fake view (real WebGL not tested): title "Ploskev z = f(x, y)", aria "Ploskev funkcije: <name>", one marker, 116 polylines.
- Checkpoint restore returns the state (including numeric); defaults: bowl, level-sets, c = 1, one contour, probe (0,6; 0,8). Reset was not run in the probe (initial state = `DEFAULT_CONTOUR_STATE`).

## Probe summary (answers visible before the learner acts)
- Level-sets mode: status, `level` row and legend show c and the contour; the dashed through-contour and `probe-f` are visible. Gradient/perpendicularity are not shown.
- Gradient mode: status states gradient, length and perpendicularity at once; rows gradient, tangent, dot = 0 are shown. Switching back to level-sets hides all of them (probe rows stay).

## Doubts
- Hills maxima/minima/saddles at pi/2 are not on the 1/20 grid: the nearest probe (1,55; 1,55) gives gradient (0,0208; 0,0208), not zero, so no "gradient is zero" status at a maximum is reachable. Only (0; 0), a saddle of hills, shows it. LS2 text must not promise zero at a maximum.
- No in-scene labelling of maxima, minima or saddles exists.
- Real WebGL surface and Reset button not exercised.
