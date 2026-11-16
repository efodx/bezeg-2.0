# F3 solids Batch B, slice 1 (worker note)

## Written
- `src/learning/model.ts` (solids union + comment): `set-shear {shear}`, `set-discs {discs}`, `set-cursor {cursor}`, `set-axis {axis: 'x'|'y'}`.
- `src/graphs/solids/SolidsGraph.tsx`: four cases in `applySolidsAction`; `commitSolids` patch now also writes shear/discs/cursor; `stackPair` import. `set-axis` reframes, the others do not.
  `set-shear` throws `solids set-shear: the cone and the cylinder are not sheared (...)` for the failing pair in stack mode; sphere axis y throws `solids set-axis: axis inconsistent.` (from `parseSolidsState`).
- `src/graphs/solids/SolidsLessonActions.host.test.tsx`: 3 new tests plus the old `set-shear` refusal changed to an unknown `set-twist`.

## Observed
- Red: new ops thrown early -> 4 failed, 7 passed (`host-red.log`). Green: `host.log`. `just unit src/graphs/solids src/solids`, `just typecheck`, `just lint` all passed.
- The Edit tool left CRLF in SolidsGraph.tsx and the test; converted to LF (0 CR).

## Probe summary (full: `.command-logs/solids-b/probe.txt`, sl + en)
- Stack mode ids: cube, square-prism (sheared pair), cone (failing pair) (`solidsModel.ts:53`). Switching from the default cube to stack keeps the cube: volumes 1 and 1, slice area 1 and 1, height 0,5. Square-prism: 2x2x3, z -1,5..1,5, volumes 12 and 12 (mesh = exact), slice areas 4 and 4 at every shear/cursor. "Height of the slices" row is the z coordinate, not a fraction (cursor 10/20/30 -> -0,75 / 0 / 0,75 for the prism; 0,25/0,5/0,75 for the cube).
- Default slabs = 10 (not 12); 11 slab outlines (k = 0..discs, `solidsScene.ts:246`); at 12: 13. Rows round to 5 decimals (`SolidsPanels.tsx` `fmt(..., 5)`).
- Notes shown at once in stack/sheared: "Strižba vsako rezino le premakne vstran, zato je ploščina rezin na vsaki višini enaka in prostornini sta enaki." / "The shear only slides every slice sideways, so the slice area is equal at every height and the volumes are equal." plus the one-height-only caveat.
- Failing pair (cone left, cylinder right, offset 4, `solidsScene.ts:220`): cone r=3, h=4; volumes 37,59154 (mesh) / 37,69911 and 112,77463 / 113,09734; areas at cursor 10/20/30: 15,85893 / 7,04841 / 1,7621 vs 28,19366. Note: "The slice areas differ: ... nothing follows about the volumes." Shear control replaced by a text ("Strižba velja le za kocko in štiristrano prizmo; ..."), the action throws.
- Volume mode: all 8 solids. It draws ONE solid: no pyramids, no split of the cube, no labels, no board text. Rows: mesh and exact volume only (cube 1 and 1; prism 6/12; pyramid 21,33333; cone 37,59154 / 37,69911; sphere 110,27559 / 113,09734). The spec's cube-into-three-pyramids (apex (1,1,1)) does not exist in the code.
- Revolve cone (axis x; midpoint sum `solidsScene.ts:328`): disc sum 4: 37,11006; 10: 37,60486; 60: 37,69649; exact 37,69911 (12 pi). The spec's 37,110 and 37,605 agree; 100 discs are off the grid, 60 gives 37,696. The disc sum is a row only in revolve mode, not in volume mode. Axis y: washer sums 101,31636 / 100,65663 / 100,53446 vs exact 100,53096.
- Camera: every opening is fitted (dist 2,87 cube; 6,84 prism; 26,12 failing pair; 15,56 cone); resetView returns az -0,9, el 0,5 with the same fit; 'front' keeps the fit. Not checked: pixel inclusion of whole solids in the view.

## Which readouts reveal the predictions at once
- SV3 step 1 (volume of the slanted stack): yes, the first frame of stack square-prism shows both volumes 12 and 12 and the "volumes are equal" note. The lesson cannot ask for it before the learner sees it unless it hides the panel or uses the cube/other solid.
- SV4 step 1 (how many pyramids fill the cube): not answered, since nothing in volume mode shows pyramids; the lesson needs a kernel/drawing change for the three-pyramid split.
- SV4 step 4 (disc sum as count grows): the revolve panel states the disc sum and exact volume on its first frame (10 discs: 37,60486 vs 37,69911); the volume-mode cone shows no sums.

## Doubts
- The `live` status readout (data-solids-live) text lagged the mode in the probe (still showed the section text); likely a debounce, unconfirmed.
- Probe test deleted; it was a temporary file.
