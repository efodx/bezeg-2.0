# f2a-circle-02 final evidence (circle construction graph)

Files (uncommitted): `src/compgeo/circleConstructionModel.ts` + `.test.ts` (49 tests), `src/graphs/compgeo/CircleConstructionGraph.tsx` (rewritten this round, 722 lines, CRLF) + `CircleConstructionGraph.test.tsx` (20 tests, unchanged this round), `circle_construction_*` keys in `sl.ts`/`en.ts` (unchanged this round), the *delilna točka* row in `docs/tasks/circle-geometry/README.md`.

Why rewritten: an earlier mutation script restored from a shared `/tmp/orig.tsx` that another worker also used, which replaced the graph with a UnitCircleGraph copy. This round all backups live in `.command-logs/circle02-*.bak` (gitignored).

Design (see the file): `CircleConstructionGraph extends BaseGraph`, precedent `UnitCircleGraph.tsx`. `view()` caches `deriveCircleConstruction` by a key of the stored fields. `buildScene()` per mode, rebuilt only when `builtMode` differs; every object is `own()`ed, listeners are released first, then objects newest first. Each line is drawn through two owned hidden points (`anchorsOf`), never `board.create("line", [fn, fn, fn])`, which leaks helper points. Accessors per mode return 0 when the cached view belongs to another mode, so no NaN reaches the board. `createMainView` sets the container `aria-label` (re-set on language change, restored by a session cleanup). Radical status checks all three axes (coincident, then concentric, then the kernel centre status).

## Checks (observed)
- `just unit src/graphs/compgeo/CircleConstructionGraph.test.tsx`: 20/20 passed on the first run of the rewrite.
- `npx tsc --noEmit --pretty false`: no output (0 errors, including src/graphs/trig at that moment).
- `just unit src/compgeo src/graphs/compgeo`: passed (231.6 s).
- `just lint src/compgeo src/graphs/compgeo`: passed. `just build`: passed (Sass deprecation warnings only).
- `grep -nP ' +\r?$'` on the graph and this note: no match. Graph is CRLF (722 of 722 lines).

## Mutations (each restored; `cmp` identical to `.command-logs/circle02-graph.bak`, whose content was checked to be the graph first)
- Elements: Thales circle visibility forced false: tangents element test failed.
- Oracles: first tangents readout row changed from power to tangent length: tangents hand-oracle and drag power tests failed.
- Degenerate: radical status ignoring `concentric`: the radical degenerate test failed.
- Ownership: listeners not released on dispose: both ownership/unmount tests failed.
- Ownership (leak): lines built from three coefficient functions instead of two owned points: the ownership test failed (objects leaked on the board).
- Keyboard: `RADIUS_STEP` 0.25 to 0.5: the keyboard steps test and the numeric-input test failed.
- Touch: `HANDLE_TOUCH_RADIUS` 26 to 10: the touch hit-zone test failed.
- Snapping: dragged coordinate shifted by 0.4 before snapping: the drag snapping test failed.

## Drag measurement
JSDOM PLACEHOLDER, not a performance result; not re-measured this round (measured before the clobber, same design). 720 drag frames per mode (`setPosition` plus drag event): tangents median 0.013 ms p95 2.999 ms; radical 0.015 / 2.923; apollonius 0.013 / 2.278; common 0.007 / 2.384. jsdom does not render, so this covers state and kernel work only. A browser measurement per docs/performance-plan.md is owed when the graph gets a route.

## Hand oracles (verified by the passing tests)
Tangents power 144, length 12, chord `13 x = 25`, contacts (25/13, -+60/13), Thales centre (13/2, 0) r2 169/4; radical powers -5, -1, 13, axes `12 x = 52` and `6 x + 12 y = 66`, centre (13/3, 10/3), power 44/9; Apollonius centre (8, 0), r2 16, division points (4, 0) and (12, 0), ratio 2, inverse of A is B (6, 0); common external centre (15, 0), internal (15/2, 0), d2 100, 4 tangents.

## Not done
- Not smoke-tested in a real browser: no route or Preset collection is registered (registration files are outside this slice); the Preset round trip lives in the model tests.
- Per-tangent equations of the common tangents are not read out (the lines are drawn; the count and centres are read).

## Doubts
- Coordinate range [-16, 16] is a choice (the spec gives only "d <= 16").
- Kernel `radicalCentre` with only circles 2 and 3 concentric reports `parallel`/`coaxal` (it checks pairs 12 and 13); the graph status handles it and a test documents it. Kernel not changed.
- Internal contact: the kernel labels the single common tangent `external` (mathematical review).
- Concentric common circles: the kernel result (count 0 versus the status) is a gap the graph papers over with the `concentric` relation.
- A = B, P = B, P = O, concentric and coincident circles are statuses, not rejected states.
- The `PA : PB` board text is empty at P = B (no label drawn).

## Review repairs
- Key help paragraph has id `circle-construction-input-help`; every NumberInput (circle centre x/y, radius, point x/y, ratio) passes `describedBy`. The help states the ranges (-16 to 16, radius 0,25 to 8, ratio 0,5 to 4) from the model constants (`COORD_LIMIT`, `RADIUS_MIN/MAX`, `RATIO_MIN/MAX`) through `{value0..5}`.
- Board captions: circles `1`/`2`/`3`, contact points `T1`/`T2` (readout "Točka dotika T1"), division points `N`/`Z` (sl) and `I`/`E` (en) with the readout names carrying the same letter; the external point uses a triangle face, the internal a diamond.
- Ratio field uses `snapRatioInput` via `editRatio` (NaN refused); `PA : PB = ` is the key `circle_construction_ratio_caption`; `plainPoint` uses the locale number formatter.
- sl text: "ni tangent" / "ni skupnih tangent"; internal touching status names the contact as the external centre of similarity (both languages).
- By design: choosing a mode loads that mode's example state, so edits in the previous mode are discarded (spec's default examples). `parse`/`serialize` have no consumer until registration (task 03).
