# F3 recursion Batch C (worker notes)

## Written (slice 1)
- `src/learning/model.ts:611-615`: `set-log` (`y0?`, `logQ?`, `logModel?: 'exponential' | 'power'`), comment.
- `GrowthGraph.tsx:482-486`: `editStored("set-log", patch, ["y0","logQ","logModel"])`. `RecursionCobwebGraph.tsx:508-509`: refusal "recursion set-log: this operation belongs to the growth graph."
- Host tests: three growth cases (equals controls, sync sequence + checkpoint, invalid values), one cobweb refusal row. Red: 3 failures (`.command-logs/rec-c/host-red.log`); green `host.log`, `s1-unit.log`, `s1-tsc.log`, `s1-lint.log` all passed.

## Observed / probe summary
Full text: `.command-logs/rec-c/probe.txt` (sl + en, 11 openings + Reset).
- Log panel readouts show at once: q (factor row), last y and ln y, slope through first/last point, slope of first and last step, ln q, "q from slope (e to the slope)", "points on a line?". The status line states slope, ln q and q already. So no opening hides the slope or q before step 4.
- Defaults: sequence panel arithmetic a1=3, d=2. Reset from log returns to that.
- y0=1000 q=105: slope 0,04879, y10 1628,894627, ln y10 7,395657. Board y window -1.361..9.984 (line fills it). q=200 slope 0,693147; q=50 slope -0,693147; q=150 0,405465.
- Power y0=1000/1: status says points do not lie on a line (first step slope 1,386294, last 0,19062); no q row; last point is y11.
- Axis captions: x "n (korak)" / "n (step)"; y "ln y (logaritem y, brez enote)" / "ln y (logarithm of y, no unit)". The note says the axis is ln y on an ordinary scale, not a true logarithmic one.
- Step 1 ordinary axis: interest panel (capital 1000, rate 10 = 5 %, years 10, parts 1) shows 1628,89 compound (also simple 1500, continuous 1648,72), axes "t (leta)" / "vrednost"; honest for 1000*1,05^n, but with three other curves. Sequence geometric cannot reach 1,05 (q stored times 10, q=10 gives 1).

## Doubts
- Interest curves are in t (years), not discrete n, and carry extra curves; slice 2 phrases around it.
- Board texts read via JSXGraph objects in jsdom; not seen in a browser.
