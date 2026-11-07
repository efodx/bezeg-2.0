# Row clips start from the recipe poster scene (worker handoff-v13)

Start scene change: `scripts/demonstration-clip-rows/_scene.cjs` (`openRecipeScene`, replaces `_examples.cjs`), called from `_driver.cjs` (captureRow, captureDiscrete, dragSurface: full `applyRecipe`) and `scripts/capture-demonstration-previews.cjs` (all ids now take the plain-route branch with the full recipe). `exampleId` and the manifest `exampleScene` field are gone from schema, check, rows, tests, README.

Nothing is published: every capture passed its own checks (except the rows below), but publishing validates the whole stored set and orientation and polygon-area cannot be recaptured, so the stored records (still with `exampleId`) fail `assertRowEvidence` ("a row has exactly the fields"). Same cause fails 5 tests in `_rows.test.cjs` under `just tooling-test` until the set is published. Staged posters were copied to `.command-logs/w13/poster-<id>.png` (not the catalog).

| id | captured | CRF | row change | failure / cause |
| --- | --- | --- | --- | --- |
| curve-offset | yes (staged) | not read | path -1,-0.7,-1,-1.3,-1 (recipe starts at d=-1) | none; poster shows parabola, offset, cusps |
| reduction | yes (staged) | not read | none | none |
| patch-coons | yes (staged) | not read | none | none |
| inscribed-angle | yes (staged) | not read | none | none |
| triangle-centres | yes (staged) | not read | drag 0.4 right (was 4) | 4 units: "no CRF up to 34 fits 300 KiB"; 0.8: "Decoded background changed" |
| euler-line | yes (staged) | not read | drag 0.25 right (was 4) | 4/1.5/0.8/0.4: size or "Decoded background changed at frame N" |
| simson-line | yes (staged) | not read | path 60,100,140,100,60 (recipe t=60) | none |
| orientation | NO | - | none | loop does not close: fineGrid rescale changes the readout "+8: levi zavoj" to "+524288" (grid units) |
| polygon-area | NO | - | none | same: readouts +12/+18 become +786432/+1179648 and the lattice marks vanish |
| inversion | NO, row removed | - | row deleted | recipe scene (circle not through centre) has only integer controls; draggable C, r, S snap to integers or drag dependents; the theta slider exists only in the "power" example |

Needs a decision: orientation and polygon-area need app code (grid readout in board units, or restoring/ignoring the rescale after release); inversion needs a smooth control in its recipe scene or a discrete row with a reason. CRF is recorded in the manifest only on publish.
