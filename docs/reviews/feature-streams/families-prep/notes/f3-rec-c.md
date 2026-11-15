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

## Slice 2 (RG5 lesson content)

### Written
- `src/learning/content/recursionLogScaleGuidedLessons.ts`: `recursionLogScaleLesson` (id via demonstration `recursion-growth`, 6 steps `rg5-ordinary`, `rg5-predict-log`, `rg5-line`, `rg5-slope`, `rg5-power`, `rg5-explore`), helper `recursionLogSceneActions`, constants `RG5_INTEREST`, `RG5_LOG`, `RG5_EXPLORE`. Reuses `RecursionSceneInterest` from `recursionGuidedLessons.ts`. Not registered (slice 3).
- Probe 2: `.command-logs/rec-c/probe2.txt` (test deleted). Checks: `s2-tsc.log`, `s2-backslash.txt` (0 singles), `s2-lint.log`, `s2-unit.log` all passed.

### Numbers per step with source
| Step | Number | Source |
|---|---|---|
| 1 | ratio 1,05; growth 50 and 52,50; 1628,89 | rule arithmetic (1000*0,05; 1050*0,05); probe interest row |
| 2 | slope 0,04879, ln q, q 1,05; chooser keeps y0=1000, logQ=105 | probe2 "after chooser to log" |
| 3 | ln y10 7,395657; ln 1000 about 6,907755 (3 ln 10); y0=100 gives 5,093072; drop ln 10 about 2,302585; slope 0,04879 | probe (y0=1000), probe2 (y0=100), arithmetic |
| 3 example | log10 1,05 about 0,0211893; log10 y10 3,211893 | spec default, stated as arithmetic |
| 4 | q=2: 0,693147, q from slope 2; q=0,5: -0,693147, 0,5 | probe and probe2 |
| 5 | first step 1,386294 (2 ln 2), last 0,19062 (2 ln 1,1); "Točke na premici?" no | probe power y0=1000 |
| 6 | q=1 slope 0 (ln 1); q=2, q=0,5 as above | arithmetic, probe |

### Deviations
- Steps 1 and 2 share one interest scene; steps 3-5 share one log scene (y0=1000, q=1,05); step 6 equals it (neutral).
- q slider "Faktor rasti q" and y0 slider "Začetna vrednost" are named without the subscript (notation test flags unicode subscripts outside math).

### Test design
- Scenes: `recursionLogSceneActions(id, spec)` = prepared-scene, `set-map {panel}`, `set-interest`, `set-log`. Readouts via `[data-readout]`, status `[data-recursion-status]`.
- Openings: RG5_INTEREST status "Po 10 letih: ... obrestno obrestovanje 1628,89 ..."; RG5_LOG slope 0,04879, ln y10 7,395657.
- Learner actions: choose panel `log` (label Prikaz); type y0=100 gives ln y10 5,093072 (slope unchanged); type q 2 gives slope 0,693147; q 0,5 gives -0,693147; choose model `power` gives first/last step 1,386294/0,19062. All in probe2/probe.
- Quote list: every number above with its source in the table.

### Still to do
Slice 3 (registration, chapter, tests, notation test run).

### Doubts
- Row names in prompts quoted by label without symbols (e.g. "Naklon prvega koraka"); no browser check.
- Step 1 mixes years t and steps n, as noted in slice 1.
