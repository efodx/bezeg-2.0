# f2a-comb-02 note (combinatorics task 02: state model and graphs) - LatticePathGraph and CountingTreeGraph DONE

Uncommitted. Both graphs are compiled, tested, linted, mutation-checked and built.

## Done (files)
- `src/combinatorics/combinatoricsModel.ts` + `.test.ts`: API as before (`snapInput`, `withTarget`, `deriveLattice`, `gridCounts`, `deriveExpansion`, `deriveCounting`, `treeLeaves`, `deriveMultiset`, `deriveRow`, `formatCount`, ranges: a,b 0..20, n 0..12, c -9..9, `TREE_LEAF_LIMIT` 64, `ROUTES_PER_PAGE` 10, `TRIANGLE_ROW_LIMIT` 12, `STRINGS_MAX_N` 5).
- `src/graphs/combinatorics/combinatoricsText.ts` (helpers shared with the counting graph: `countText`, `smallText`, `superscript`, `pointText`, `binomText`, `listText`, `routeLetters`, `binomialText`, `SceneObjects`, `Poly`/`addPolyline`/`boxPoints`/`emptyPoly`, touch radii).
- `src/graphs/combinatorics/LatticePathGraph.tsx` (now also sets the board `aria-label` through `createMainView`, the Isometry pattern) and `LatticePathGraph.test.tsx` (27 tests).
- Locale `combinatorics_*` block in `sl.ts`/`en.ts`. Changed this session: `combinatorics_view_label` is now "Vsebina" / "Content" (it was "Prikaz"/"View", which collided with the inspector's "Prikaz" tab: `getByLabelText` found two elements). The counting graph reuses this key.
- `docs/tasks/combinatorics/README.md`: term rows added (D/G route letters, "Po meri", "(izračunano)", "Vsebina").

## Evidence for LatticePathGraph (observed)
- `npx tsc --noEmit --pretty false`: exit 0, no output (after the random worker's keys landed; the first run's only errors were in `src/graphs/random`).
- `just unit src/combinatorics src/graphs/combinatorics`: exit 0, all passing (28 before the temp perf test was deleted; final run has 27 graph tests plus the 6 model files).
- `just lint src/combinatorics src/graphs/combinatorics`: exit 0. Trailing-whitespace search on `src/graphs/combinatorics` and the README: no matches.
- Hand oracles in the test: 56 (formula `(8 nad 5) = 56`, last-step split 35 + 21, polylines 56/35/21 in the merged curves, grid 6 + 4 polylines); (6,6) 924 with 49 labels, each label = left + below against an independent grid sum, 93 pages, page 93 holds 4 routes, route 924 = `DDDDDDGGGGGG` ending (6,6) via (6,0), route 1 `GGGGGGDDDDDD`; (10,10) 184 756; (20,20) 137 846 528 820 (en `137,846,528,820`); cap at 13 steps (count 1716, cap message, no labels/route list/route and page fields, both switches `aria-disabled`); triangle (4,3) row 7 place 4, `35 = 20 + 15`, box x 10.05..11.55 y centre 9.7, 91 labels sum 8191, edge (0,5), off view (10,10); expansion n=5 c=2 1,10,40,80,80,32 sum 243, bar of 80 reaches y 17.5; n=3 c=-3 1,-9,27,-27 sum -8, bar j=1 top 8.1667; strings n=4 groups 1,4,6,4,1 (16 strings), n=6 off message; drag (3.4,2.6)->(3,3), (25,-3)->(20,0), NaN ignored; keys (1, Page 5, route 10, n and c 3); touch `hasPoint` 25 px true, 40 px false, mouse 25 px false; help id on every numeric field and switch; language switch; ownership (object count back to pre-mount, drag/over/out handlers 1/1/1 to 0/0/0, view change rebuild, `initialize()` rebuild, StrictMode, unmount).
- Acceptance 4, JSDOM PLACEHOLDER (temp file deleted; log `.command-logs/comb02c-perf.txt`): 86 board objects at (6,6) with 49 labels and the merged NaN-break curves; `board.update()` median 6.48 ms, p95 11.96 ms over 15 rounds; with 924 additional one-curve-per-route objects median 23.14 ms, p95 26.51 ms. jsdom has no rendering, so this measures JSXGraph bookkeeping only; browser measurement (drag at 924 routes) is owed at F2b.
- Mutations (one per assertion group; each run failed, then restored and content-checked, `cmp` ok on the last; backups `.command-logs/comb02c-<name>.bak`): split curve swap, cell loop bound, cap reason removed, route page offset, triangle x spacing, `BAR_HEIGHT`, a removed `off("over")`, touch radius to the mouse radius, route field `describedBy` removed, board-label language listener removed, drag range widened, view rebuild removed. Model mutations were done in the earlier session.

## Decisions and doubts for review
- Shared rules over task wording: route list paged with `CountSetter`; a triangle entry is chosen through the numeric a/b fields (target = entry), not by clicking; examples via select with `custom`; no reset; no playback.
- Keyboard moves of the target are the arrow keys in the a/b fields (no focusable board handle).
- Above the cap the count labels, route list, route and page fields are absent; the two switches show the cap message as their unavailable reason.
- Hockey-stick is a sum of C(j,k) (CountingTreeGraph); ranges are mine; route letters D/G follow the spec F2a decision.
- The formula readout shows C(a+b, a) (so `(8 nad 5)` for a=5), equal to C(8,3).
- Not verified: browser behaviour, touch dragging on a device, screen-reader output, `just build`.

## CountingTreeGraph (final evidence)
Files: `src/graphs/combinatorics/CountingTreeGraph.tsx`, `CountingTreeGraph.test.tsx` (33 tests). Locale: `combinatorics_counting_cap_weights` changed to Unicode superscripts (`tᵏ (1 − t)ⁿ⁻ᵏ`); JSXGraph text turned `^` into `<sup>` markup and showed `<sup>(</sup>` on the board (found by the test). No keys added; `combinatorics_computed` is reused for the double-valued weights.

Scenes: choices (tree `choices-tree` while the ordered selections are at most 64, else a 4-row table of kinds with a marker, the table note names the limit when the ordered selections exceed 64); multiset (letters M I S P as up to 48 texts, a bar per kind, the equation caption); row (bars of the weights over the largest weight, labels `C(n, j)` in two staggered rows, the chosen k bar in the accent colour). No draggable handle, so no touch or drag tests (a test asserts every owned point is fixed and no listener is owned). Panel: view and example selects (examples only of the view, `custom` while none matches), n and k (k up to n without repetition, clamped when n drops; the row k is capped at n), letter counts, t in hundredths via `snapInput`, two switches, readouts as `dl`, `LiveReadout`, help id on every field.

## Checks (observed)
- `npx tsc --noEmit --pretty false`: exit 0, no output.
- `just unit src/combinatorics src/graphs/combinatorics`: exit 0, 7 files, 122 tests passed.
- `just lint src/combinatorics src/graphs/combinatorics`: exit 0. `just build`: exit 0 (warnings in the log, as before). Trailing whitespace in `src/graphs/combinatorics` and the README: none.
- Hand oracles in the test: V(6,3) 120, 6^3 216, C(6,3) 20, C(8,3) 56 (table row counts); 5! 120; 4^3 = 64 tree with 4 + 16 + 64 = 84 edges, 5^3 = 125 table; V(5,3) 60 with 85 edges; V(4,4) 24 with 64 edges; 20! and 20^20 (1048576 followed by 20 zeros, en separators); MISSISSIPPI 11!/(1!4!4!2!) = 34 650, 11! 39 916 800, 9!/(1!4!4!) = 630, 48 letters of 12 each against an independent factorial quotient; row 10 sum 1024 and alternating 0, bar heights by hand; hockey 1+4+10+20+35 = 70 = C(8,4) and C(13,3) = 286; weights 10/32 = 0,3125, 270/1024 = 0,263672, 184756/2^20 = 0,176197; t = 0 and 1; sums 2^n for n 0..20.
- Mutations (each failed, restored, `cmp` identical; backups `.command-logs/comb02d-<name>.bak`, summary `.command-logs/comb02d-mut.txt`): kind flags of combinations with repetition, tree group test `every` to `some`, multiset equation drops a factor, hockey terms, bar scale, `T_DENOMINATOR`, `keepKValid` in the switch, `describedBy` of t, board-label language listener, `rowPlace` clamp, disposal bypassed, cache keyed on state removed (cachekey run separately, failures confirmed), product factors, view-switch clamp, example matching.

## Decisions and doubts for review (CountingTreeGraph)
- Unordered kinds always show the table (the model's `treeShown` needs `ordered`); the k! orderings of one combination are a readout list for k = 1..4, not a drawn grouping. Acceptance 2 (k! orderings per combination) is therefore met by the readout, not the board.
- Weight bars are scaled to the tallest bar (drawing only); the caption does not say so.
- Row n is 0..20 (model range), the row labels at n = 20 are six digits and rely on the two staggered rows.
- Leaves of the tree beyond 32 use font 11 and three staggered rows; legibility at 64 leaves is unchecked in a browser.
- Letters M I S P are fixed (not localized); kind colours are bars under the letters.
- Not verified: browser behaviour, screen-reader output, performance (no measurement; jsdom only), registration and routes (outside this slice).

## Review repairs (comb02e)
Tests added: `review repairs` describes in both graph test files, `orderingGroups` in the model test. Model test observed failing before the function existed (`orderingGroups is not a function`); the four lattice tests were observed failing (4 failed, log `comb02e-u3.log`) before the lattice code; the counting-graph tests were written and then verified by mutation (below), not observed failing first.
1. Board grouping: `orderingGroups`, `ORDERINGS_GROUP_MIN_K/MAX_K` in `combinatoricsModel.ts`; `groups()`, `buildGroups()` and the moved "current" marker in `CountingTreeGraph.tsx` (table scene). Three labelled groups of exactly k! orderings plus "x C skupin = V / k!" (n=6,k=3: x 20 = 120 / 6; n=4,k=3: x 4 = 24 / 6; n=5,k=2: x 10 = 20 / 2); k outside 2..4 shows the range caption. Layout (columns of 2 units, rows 0.62) is unchecked in a browser, in particular k = 4 with n > 9.
2. Nothing silent: `notice` (bound to the state object it was made for, so it goes stale by itself) in both graphs; `announceLoweredK` after `editN`, `setFlag`, `changeView`; the lattice `setTarget` adds "Pot in stran sta ponastavljeni na 1." (also for drag and examples). Row k was already stored as min(k, n) in `editN` and `changeView`; it is now announced. A preset loaded with row k > n is still only guarded by `rowPlace()` (not rewritten in the state).
3. Refusal: `typed()` in both graphs (counting `editN`, `editK`, `editCount`; lattice `editTarget`, `editExpansion`) refuses a value that `snapInput` would change. The `NumberInput` itself still snaps a typed non-integer to the grid with its own "snapped" hint before the graph sees it (so `4,5` in the field becomes 5, shown by the field); the graph-level refusal is tested by calling the edit methods. `dragTo` keeps snapping (code comment). `editT`, `editRoute`, `goToPage` unchanged.
4. Weights: `weightText` ("< 0,000001" / "< 0.000001"), labels say 6 decimals, both captions name the scale (keys `combinatorics_counting_cap_weights`, `combinatorics_lattice_cap_expansion`).
5. Selected bar: text "k = 5" above the bar top (`MARKER_GAP`), test checks position for k = 5 and k = 2.
6. Terms: "Binomski izrek" (en "Binomial theorem"), "Koraki desno (a)" / "Koraki gor (b)"; README rows added.
7. Caches: `PASCAL_ROWS` frozen module constant; `routeCache` cleared in `disposeScene` (`hasRouteCache()` diagnostic).
New keys (sl/en): `combinatorics_lattice_notice_reset`, `combinatorics_counting_{weight_tiny,notice_k,cap_group,cap_groups,cap_groups_range,cap_bar_k}`.
Checks (observed): `just unit src/combinatorics src/graphs/combinatorics` exit 0 (136 tests); `npx tsc --noEmit --pretty false` exit 0; `just lint ...` exit 0; `just build` exit 0; no trailing whitespace or control characters in owned files.
Mutations (each failed as intended, restored, `cmp` identical, backups `.command-logs/comb02e-<name>.bak`): counting and lattice `adjusted` check removed, tiny-weight condition, lowered-k notice, `MARKER_GAP` 0, lattice reset notice, route cache clearing, `ORDERINGS_GROUP_MAX_K` 5.
Not verified: browser rendering of the new captions (overlap, legibility), screen-reader announcement of the notices (the live region gets `statusText()`, asserted only through the status paragraph).
