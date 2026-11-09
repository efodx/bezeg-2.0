# Wave 2 smoke, group a (commit a474efb2 preview, desktop 1280x800)

Scripts and screenshots: `.command-logs/w2-smoke-a/` (run*.mjs, *.png). Language switch is the first `select` in the header (SL/EN).

| Route | 1 load | 2 controls | 3 refusal | 4 keyboard | 5 SL-EN-SL |
|---|---|---|---|---|---|
| euler-line | pass | pass (example select changes scene; Show all and Reset view absent; Fit frames H,G,O,N, euler-fit.png) | n/a | pass (tab 23 to select, ArrowDown changes, 3px outline) | pass |
| simson-line | pass | pass with note E1 | not exercised | pass (field focus outline) | pass |
| inscribed-angle | pass | pass | not exercised | pass | pass |
| inversion | pass | pass (theta in power example) | pass | pass | pass |
| polygon-area | pass | pass | pass with note P1 | pass | pass |
| point-in-polygon | pass | pass | not exercised | pass | pass |

Console errors: 0 on all routes.

## Observations
- E1 (discrepancy with brief): Simson epsilon slider has nine stops (0..8), valuetext -0,2 / -0,05 / -0,01 / -0,001 / 0 / 0,001 / 0,01 / 0,05 / 0,2, not five.
- Simson: angle field 370+Enter gives 10 (slider 10); 0 then ArrowDown gives 359. Selecting mode glider leaves example select on "custom".
- Inscribed angle: field ArrowUp from 0 never stalls; crosses gaps 202 to 203,7 and 335,7 to 337,3 and wraps 359,3 to 0,3. Values after a gap carry a fractional offset (.7), visible in the field.
- Inversion: examples map to modes (power example has theta slider/field 0..360; 370 gives 10, ArrowDown at 0 gives 359; slider keys also wrap). Integer field r0: typing 99 + Enter keeps 99 with message "Vnesi vrednost med 1 in 8." once (inversion-refusal.png); blur reverts to 3.
- P1: polygon-area Reverse becomes unavailable (aria-disabled, aria-describedby, title) at 1 or fewer points, not below 3: it stays enabled at 2 points. Reason "Za obracanje sta potrebni vsaj dve točki." appears once in DOM after a click on it, persists at 0 and 1 points, clears at 2. The separate "3 oglišča" notices are existing area/simple-polygon messages (sr-only), not Reverse refusals. Dispatch text said "below 3 points"; observed threshold is 2.
- Point-in-polygon: editing P1 x gives select value "custom" (label "Po meri", disabled option); choosing "notched" restores. q field edits with Enter update the verdict (3,1 inside; 20,20 outside; 1,1 inside).
- Fit on euler: not measured numerically, screenshot shows H,G,O,N and triangle in view.

## Gaps
Refusal check not run on simson/inscribed/point-in-polygon (no refusal named). Touch 390x844 not run. No board drag checks.
