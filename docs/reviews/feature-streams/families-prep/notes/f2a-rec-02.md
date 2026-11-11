# f2a-rec-02 final evidence (recursion task 02: cobweb graph and growth graph, no route)

Files (uncommitted): `src/recursion/recursionModel.ts` (+`.test.ts`: cobweb state, growth state, `deriveGrowth`), `src/graphs/recursion/RecursionCobwebGraph.tsx` (+test, 45 tests), `cobwebScene.ts` (+test), `SceneObjects.ts`, `GrowthGraph.tsx`, `GrowthGraph.test.tsx` (29 tests), `growthScene.ts` (+test), `recursion_graph_*` keys in `sl.ts`/`en.ts` (114 `recursion_graph_growth_*`, lockstep, only insertions in `git diff`), term rows in `docs/tasks/recursion/README.md`, status in `02-graphs.md`.

## Checks (observed, this round)
- `just unit src/recursion src/graphs/recursion`: exit 0 (`.command-logs/rec02e-unit.log`; test count not shown by the recipe).
- `npx tsc --noEmit --pretty false`: no errors except `src/graphs/functions/WavesGraph.test.tsx` (waves worker, ignored per brief). Before the fix my test had TS2345 on help keys; fixed (`rec02e-tsc.log`).
- `just lint src/recursion src/graphs/recursion`: exit 0. `just build`: exit 0.
- Trailing whitespace and control characters: 0 in all owned files, both locale files, both task docs and this note.

## Fixed this round
- Caption "zvezno (P·e^(p·t))": JSXGraph text turned `^(` into `<sup>(</sup>`; both locales now say `P·exp(p·t)` (found by the caption test). Edited with `sed -i` on the one line each (not the Edit tool), in the presence of the waves worker's edits; the diff against HEAD is still insertions only.
- Verified the script-inserted keys: no control characters, `"key": "value",` shape, same key order in both files.

## Mutations (each failed the tests, was restored, `cmp` with `.command-logs/rec02e-<name>.bak` identical; logs `rec02e-mut-<name>.log`, driver `rec02e-mut.py`)
| name | change | failing tests |
| --- | --- | --- |
| bars | `barsPath` bar corner `0` to `1` | 2 |
| bigint | `q % Q_SCALE === 0` exact path disabled | 5 |
| limit | `\|q\| < 1` to `<=` | 3 |
| slope | difference-quotient denominator | 6 |
| computedkey | `editInteger` writes `a1` instead of `[field]` | 2 |
| ycaption | log axis caption key replaced | 2 |
| dispose | `scene.dispose` skipped | 3 |
| cache | cache not keyed on state identity | 14 |
| markers | log markers not limited to n + 1 | 4 |
| legend | legend lines shown in the wrong panel | 4 |
| exactflag | exact/computed status text swapped | 1 |
| ratescale | rate edit uses `RATE_SCALE` not percent scale | 1 |
| rateparts | relative interest uses m = 1 | 7 |
Cobweb half (earlier round): 10 mutations, same procedure (`rec02c-mut.py`).

## Measurement (JSDOM PLACEHOLDER, not a browser)
60 `setState` redraws x 10 mounts per panel (n or years varied; log `rec02e-measure.log`): sequence median 6,26 ms, p95 9,00, max 16,62; interest median 6,72, p95 8,88, max 18,07; logarithm median 6,61, p95 9,51, max 22,67. Cobweb: median 3,25, p95 6,01. A real-browser number is not taken.

## What the graph tests cover (GrowthGraph.test.tsx)
Mount defaults (a10 = 21, S10 = 120); bars curve against `barsPath` and hand values; q = 2 (1536, 3069), q = 0,5 (5,994141, limit 6 line and caption, no limit at \|q\| = 1); BigInt beyond 2^53 (99 x 3^29, 99(3^30-1)/2) and negative ratio; decimal ratio computed; interest numbers (1500 / 1628,89 / 1647,01 / 1648,72, 0,407412 %, 14,2067), curve ends against closed forms, four distinct styles repeated in the legend, m = 1 and 365, e table; log panel slope ln 1,05 = 0,04879, ln y points, chord, axis caption `ln y ...` (never plain `y`), power model slopes (ln 4, ln 1,21, ln 121 / 10); point count follows n; panel change builds nothing (ids equal, 55 owned objects constant); help with range via `aria-describedby` on every field; typed out-of-range refused with `aria-invalid`, state object unchanged; every edit method refuses/accepts and writes only its own field (computed-key patch); program changes announced in the live status (fake timers); decimal comma / point and true minus; dispose and rebuild back to the pre-mount count with none of the old ids reused, double dispose harmless; unmount and StrictMode timer deltas against a JSXGraph baseline; derived cache identity; language switch in all panels.

## Decisions and doubts for review
- Log doubt resolved by the handler: the logarithm panel plots (n, ln y) on an ordinary linear axis with the chord; the axis caption is `ln y (logaritem y, brez enote)` and the board label says it is not a true logarithmic scale. No stored field for an "ordinary-axis view".
- Preset restore (`defaultPreset`, reopened Preset paused, RG1 Reset/Preset/restore test) is owed at F2b for both graphs, as for the earlier F2a graphs; the model parse/serialize round trip is tested here. `GrowthGraph` has no playback; the cobweb tests cover pause on edit, fake-clock playback and reduced motion.
- `editInteger` takes `field: keyof GrowthState & string` and writes `{[field]: checked.value}`; it compiles, and the mutation `computedkey` shows the tests notice a wrong field. The type system does not check that `value` fits the field (all numeric fields share the helper).
- `sequenceOf` takes the BigInt path when a1 and (d or q % 10 = 0) are whole; the test above 2^53 shows exact digits. Values are written in full without grouping (up to 17 digits: 10294556604732400 for a1 = 100); the rows/sentences may be long on a narrow panel and no layout check was made.
- Sequence rows use the six-decimal `num`; 5,994140625 shows as 5,994141 (the spec value is exact in the model test).
- Interest curves are the formulas for non-integer t, not the stepwise balance (also with m = 365).
- Captions are placed by window fractions; overlap with tick labels and between caption rows (up to 4 rows in the interest panel) is not visually checked. No browser, screen reader, touch or contrast check. A new caption containing `^`, `_` or `<` will be re-parsed by JSXGraph text (see the `^(` fix); the growth captions use none now.
- All 55 objects exist on the board for every panel (hidden by `visible`), including 31 log markers: ~44 hidden objects per redraw. Measured above on JSDOM only; if a browser shows cost, create by panel.
- Slovenian wording is the worker's choice where the README table has no row (rows added there): zaprta oblika, limita vsote, Logaritem y, premica skozi prvo in zadnjo točko, natančno/izračunano, zvezno obrestovanje, Prikaz (panel label; it collides by text with the inspector "Prikaz" tab, so tests find the panel select by role `combobox`).
- Cobweb doubts carried over: cosine start range [-2, 2]; affine window [-10, 10]^2; logistic shape is local; `cobwebPath` stops at \|v\| > 1e6; start/iterate caption overlap unchecked; cobweb terms (iterat, stopnice/spirala, privlačna/odbojna, dvojni cikel, izumrtje) are my choice.
- Concurrency: the earlier script-based locale write happened while another worker's keys were in the file; the current `git diff` for both locale files is insertions only, and no non-recursion key was changed by me.
- No smoke test: no route exists; the graphs are unit-tested only.

## Review repairs (round f)
Evidence: logs `.command-logs/rec02f-*.log`; mutations restored, `cmp` with `rec02f-<name>.bak` identical.
1. Outside write while playing: `RecursionCobwebGraph.tsx` `setState` override (about line 129) marks a write made outside the tick (`ticking` flag around the tick's `setState`, `onStateChange` checks it). Test "an outside write of exactly step + 1 while playing pauses it". Mutation `outside` (condition ignores the mark): the unit run fails.
2. Preset deferred to F2b: line added to `02-graphs.md` status; the contradicting line in "Decisions and doubts" above rewritten.
3. Captions `recursion_graph_shape_staircase`/`_spiral` say "near x*" in both locales. No test pins the wording.
4. New key `recursion_graph_cap_iterate_off` (sl, en); caption at `RecursionCobwebGraph.tsx` (iterate caption, about line 221) picks it when the iterate is off view. Test "the iterate caption says ... outside the view" covers both; mutation `offcap` fails the unit run.
5. Reset label now `t("reset")` (about line 525); tests press `t('reset')`; mutation `resetlabel` fails.
6. Not done, recorded as a doubt: the speed-slider reduced-motion reason is read at render, not refreshed on a `matchMedia` change. No graph in `src/graphs/` subscribes to the query, so there is no pattern to follow; a changed system setting shows after the next render.
7. `recursion_graph_growth_r_continuous` now `P·exp(p·t)` in both locales (the only remaining `e^(` among the recursion keys; the readout key already used `exp`).
8. `recursion_graph_growth_cap_y_interest`: currency sign dropped ("vrednost" / "value").
9. `recursion_graph_speed_reduced` (sl): "predvajaj" lower-case after the colon.
10. `GrowthGraph.tsx` `NumericKeys<GrowthState>` type for `editInteger`; mutation `typed` (field "kind") fails `tsc`.
Checks: `just unit src/recursion src/graphs/recursion` exit 0; `tsc` no errors outside `src/graphs/functions`; `just lint` exit 0; `just build` exit 0; trailing whitespace and control characters 0 in owned files and both locale files; no removed locale lines outside `recursion_graph_`.
