# F3 combinatorics Batch C, slice 1 (set-row action and probe)

## Written
- `src/learning/model.ts` (union + comment): `{kind:'combinatorics', operation:'set-row', n, k?, t?}`.
- `CountingTreeGraph.tsx` `applyCombinatoricsAction` case `set-row` (validated in full, then one `setState`); `LatticePathGraph.tsx` rejects it with the counting-graph message.
- Semantics: view `row`; n integer 0..20; k absent = current k lowered to n (what the n field does), else integer 0..n; t = slider value, exact multiple of 0,01 in [0,1] (1e-9 float tolerance, so 0.07 is 7), absent = t unchanged (view change does not reset t). Errors `combinatorics set-row: ...`.
- Controls' lowered-k notice ("k je znižan na N.") is control-only; the action sets silently (test drops that suffix from the comparison).
- Host tests (3 new): equality with controls (9 cases), sync sequence + checkpoint restore, invalid payloads. Red (set-row routed to throwing branch): 3 failed, 5 passed (`host-red.log`); green `host.log`. Unit combinatorics green, typecheck, lint clean, LF.

## Observed (probe.txt has all openings, sl and en)
Default state is view `choices` n 6 k 3 t 50; Reset returns to that, leaving the row view. Board window [-0.5, 24.5] x [-2.5, 24.5]; bar x at n = 20 is 23.9, inside; captions at y 23.4, 22.2, 21.

## Probe summary (sl)
First frame of every row shows, with no learner action: status "Vrstica 10: vsota 1 024, izmenična vsota 0."; readouts "Vsota vrstice = 1 024 = 2¹⁰", "Izmenična vsota = 0", "Vsota po diagonali = (5 nad 5) + (6 nad 5) + … + (10 nad 5) = 462 = (11 nad 6)", "Utež pri izbranem k (na 6 decimalk) = 0,246094 (izračunano)", "Vsota uteži v vrstici ... = 1 (izračunano)". So row sum, alternating sum, hockey stick and weight are ALL stated at once: no readout hides an answer; a prediction step must hide them by asking before the scene action or accept that they are visible (readouts cannot be hidden).
- n 4/5/6: 16/32/64 with 2⁴/2⁵/2⁶, alternating 0. n 0: "1 = 2⁰", alternating 1, status "vsota 1, izmenična vsota 1". n 1: 2, 0.
- Hockey n 7 k 3: "(3 nad 3) + (4 nad 3) + (5 nad 3) + (6 nad 3) + (7 nad 3) = 70 = (8 nad 4)" (five terms listed in full, more than five collapsed with …). n 10 k 4: 462 = (11 nad 5).
- Weights n 5 k 2 t 0,5: "0,3125 (izračunano)" (trailing zeros dropped), sum 1; n 20 k 10: 0,176197; n 20 k 0: 0,000001. Slider "Utež t" 0 to 1, step 0,01, big step 0,05.
- Weight caption: "Višina stolpca: utež (n nad k) · tᵏ · (1 − t)ⁿ⁻ᵏ pri t = 0,5 ...". Selected caption "izbran k = 2: (5 nad 2) = 10".
- en: "Row sum = 1,024 = 2¹⁰", "Sum along the diagonal = C(5, 5) + ... = 462 = C(11, 6)", "0.246094 (computed)".

## Doubts
- The weight readout prints a decimal, not the fraction 10/32; "= 10/32" is only in the caption formula, not the readout.
- Board captions (JSXGraph text) were not captured by the probe; the sl strings are from sl.ts and the drawn key is `row`. Bars drawn per k and visual layout not seen in a browser.
- Hockey stick readout for k kept (3) follows the current k; a lesson must pass k explicitly.

## Slice 2 (CB5 lesson content)

### Written
- New `src/learning/content/combinatoricsRowGuidedLessons.ts`: `rowSumsLesson` (id const `ROW_SUMS_LESSON_ID = 'counting-tree-cb5'`, `demonstrationId: 'counting-tree'`, 6 steps, sl + en), `rowSceneActions(id, {n,k,t})` (prepared-scene demonstration-default, then one `set-row` with n, k, t always explicit), `CB5_SCENES` (id and spec of the six openings), `CB5_CHANGES` (the state each predicting step asks for). Nothing else touched; chapter, registry, registration, preview copy, test lists, smoke specs and docs are slice 3.
- Steps: 1 sum (open n4 k2 t.5; predict row 7; enter Row n 7, then 10), 2 alternating (n6 k2 t.5; why zero; predict row 0; enter Row n 0), 3 hockey (n4 k1 t.5; predict n7 k3; enter Place k 3 and Row n 7 in either order), 4 weights (n5 k2 t.3; predict t=1/2 as fraction; slider Weight t to 0,5), 5 bridge (n8 k6 t.25; predict sum at t=0,9 and whether weight of k grows; slider to 0,9), 6 free (n6 k3 t.5; n20 k10 t.5 suggestion).
- Labels quoted: sl "Vrstica n", "Mesto k v vrstici", "Utež t"; en "Row n", "Place k in the row", "Weight t"; readouts "Vsota vrstice/Row sum", "Izmenična vsota/Alternating sum", "Vsota po diagonali/Sum along the diagonal", "Utež pri izbranem k/Weight at the chosen k", "Vsota uteži v vrstici/Sum of the weights in the row".

### Numbers per step with source (probe2.txt = `.command-logs/comb-c/probe2.txt`, sl and en)
| Step | Number | Source |
|---|---|---|
| 1 | n4 k2 opening: sum 16, alt 0 | probe2 A |
| 1 | row 7: 128 = 2^7; row 10: 1 024 = 2^10 | probe2 A after n=7; B after n=10 (also slice-1 probe) |
| 2 | n6 k2 opening: 64, alt 0 | probe2 C |
| 2 | n=0: row sum 1, alt 1, k lowered to 0 (status says so) | probe2 C after n=0 |
| 3 | n4 k1 opening: 1+2+3+4 = 10 = C(5,2) | probe2 D |
| 3 | k=3 first (n4 k3): C(3,3)+C(4,3) = 5 = C(5,4); n=7 first (n7 k1): 28 = C(8,2); final n7 k3: 70 = C(8,4) | probe2 D, both orders |
| 3 | 1+4+10+20+35 = 70 = C(8,4); C(7,3)=35 etc. | arithmetic; final readout lists the five terms in full |
| 4 | n5 k2 t.3: 0,3087 | probe2 F; arithmetic 10 x 0,09 x 0,343 |
| 4 | t.5: 10/32 = 0,3125 | probe2 F after t=0.5; arithmetic |
| 5 | n8 k6 t.25: 0,003845; t.9: 0,148803; sum 1 both | probe2 G; arithmetic 28 x 0,9^6 x 0,01 |
| 5 | means 8 x 0,9 = 7,2 and 8 x 0,25 = 2 | arithmetic |
| 6 | n20 k10 t.5: 0,176197; 2^20 = 1 048 576; 184 756 | probe2 I (sum 1 048 576); spec (184 756, 0,176197 checked) |

### Deviations
- Spec steps 1 and 2 are merged into one step (subset argument and the binomial theorem at a = b = 1 together): a separate row-10 step after row 7 would repeat the same law and predict nothing. Row 10 is the second reading of step 1's observation prompt.
- Step 3 opens on n = 4, k = 1 (not 5, 2): n5 k2 shows the weight 0,3125 that step 5 asks the learner to predict.
- Step 5 cannot hide the sum 1 (the opening reads it); the prediction asks about the state after the change (t = 0,9) and adds whether the chosen weight grows.
- No link mechanism exists in lesson steps (`bernstein-partition-of-unity` is a formula id, `binomial-explore` a step id). The lessons are named in prose: "Bernsteinove bazne funkcije" / "Bernstein basis functions" and "Od binomske k normalni porazdelitvi" / "From binomial to normal"; the text says they are existing lessons.
- English math has no thousands separator inside math (`1024`, `184756/1048576`): the notation test rejects `{,}` in English math. Slovenian uses `1\,024`.
- Formulas are attached so none states a step's answer: step 2 carries only the general binomial theorem; row-sum, alternating, hockey and weights-sum formulas sit on the free step.

### Checks (logs in `.command-logs/comb-c/`)
`s2-tsc.log` clean; `s2-backslash.txt` 0 singles; `s2-unit.log` combinatorics green; `s2-lint.log` clean; `s2-notation.log` with the lesson temporarily added: the prose test passes, the other test "scans every lesson module" fails only because it also compares the Demonstration list (slice 3 adds the lesson to it); the test file was reverted (`git diff` empty). LF.

### Test design (for the tests worker)
- Scene: `[prepared-scene demonstration-default, set-row {n, k, t}]`; build via `rowSceneActions(CB5_SCENES.x.id, CB5_SCENES.x.spec)`; the changes are `CB5_CHANGES`. Mount `CountingTreeGraph`, apply actions inside `act`, read `[data-readout]` (dt/dd) and `[data-combinatorics-status]`; learner actions via the row labels above with `enterNumber` (the t slider has a typed field named "Utež t, vrednost").
- Openings and readouts (sl; en quotes in probe2.txt): sum n4 k2 t.5: status "Vrstica 4: vsota 16, izmenična vsota 0.", "Vsota vrstice = 16 = 2⁴", diagonal "(2 nad 2) + (3 nad 2) + (4 nad 2) = 10 = (5 nad 3)", weight 0,375. After n=7: 128 = 2⁷, weight 0,164063; after n=10 (from n3 k1 as in B): 1 024 = 2¹⁰.
- alternating n6 k2: "vsota 64", alt 0, diagonal 35 = (7 nad 3), weight 0,234375; after n=0: status "Vrstica 0: vsota 1, izmenična vsota 1. k je znižan na 0.", "Vsota vrstice = 1 = 2⁰", "Izmenična vsota = 1", diagonal "(0 nad 0) = 1 = (1 nad 1)".
- hockey n4 k1: "(1 nad 1) + (2 nad 1) + (3 nad 1) + (4 nad 1) = 10 = (5 nad 2)", weight 0,25; k first -> n4 k3 "(3 nad 3) + (4 nad 3) = 5 = (5 nad 4)", then n7 k3 "(3 nad 3) + (4 nad 3) + (5 nad 3) + (6 nad 3) + (7 nad 3) = 70 = (8 nad 4)", weight 0,273438; n first -> n7 k1 "(1 nad 1) + (2 nad 1) + … + (7 nad 1) = 28 = (8 nad 2)", weight 0,054688, then the same final.
- weights n5 k2 t.3: weight "0,3087 (izračunano)"; after t=0,5: "0,3125 (izračunano)"; sum "1 (izračunano)" both.
- bridge n8 k6 t.25: weight 0,003845, diagonal "(6 nad 6) + (7 nad 6) + (8 nad 6) = 36 = (9 nad 7)"; after t=0,9: 0,148803, sum 1.
- explore n6 k3 t.5: 64, diagonal "(3 nad 3) + … + (6 nad 3) = 35 = (7 nad 4)" listed in full, weight 0,3125. n20 k10 t.5: "0,176197" (probe2 I).
- Quote list: 16, 2^4 (opening), 7, 128 = 2^7, 10, 1 024 = 2^10, 64, 0, 1 (n = 0), 10 = C(5,2), 5 = C(5,4), 28 = C(8,2), 70 = C(8,4), 1+4+10+20+35, 35 = C(7,3)... (the free-state diagonal is not quoted), 0,3087, 0,3125, 10/32, 0,003845, 0,148803, 7,2, 2, 184 756 / 1 048 576 ≈ 0,176197, 0,25 (not quoted); sources in the table above.
- Tests the worker can add: every step's scene equals the `rowSceneActions` of its `CB5_SCENES` entry; every quoted readout above appears in the graph after the scene or change; the opening of a predicting step is never its target state (compare with `CB5_CHANGES`); sl/en parity; prose test with the lesson in its list.

### Still to do (slice 3)
Chapter section, registry entry, registration, preview copy, test lists (the Demonstration list in `lessonMathNotation.test.ts`), smoke spec, docs.

### Doubts
- Step 3 and 5 prompts are long; check at inspector width. "Pri lihem n" cancel-in-pairs is stated in the formula explanation and the step 2 observation, not in an example.
- Slider step claim (0,01, arrow keys, drag) from slice 1 probe; not tried in a browser. Bars and captions not seen. The t slider typed field was only exercised via `enterNumber`.
- The word "zniža se" for k at n=0 relies on the graph status "k je znižan na 0".

### Slice 2d
- New `src/learning/content/combinatoricsRowGuidedLessons.test.ts` (tests only). Part A: structure, scene sweep on a real `CountingTreeGraph` in sl and en (out of order, twice, state, status, readouts vs independent arithmetic), restore on exit, quoted control/readout names exist in graph strings, openings never the target state and prompts name target values, learner actions (n 7 then 10; n 0; hockey k-then-n and n-then-k with intermediates; t slider to 0,5 and 0,9; n 20 k 10) give the quoted readouts, prediction answers absent from explanation/formulas/worked example. Part B: BigInt row sums (n <= 60), alternating sums, hockey stick (n <= 30), every quoted number recomputed, weights vs C(n,k) t^k (1-t)^(n-k) (1e-12; row sums 1 within 1e-15 at t = 0,5), no English decimals in sl, "približno"/"about" before rounded numbers.
- Red: sl `0{,}148803` changed to `0{,}148804` in the lesson (line 262), two tests failed (`s2d-red.log`), restored (lesson file diff empty). Green: `s2d-unit.log`. No false claim found.
- Not verified: browser rendering; the prediction-answer check lists the answers by hand (`ANSWERS`).

## Slice 3: chapter join

### Written
- `combinatoricsChapterRegistry.ts`: section `row-sums` (counting-tree, `ROW_SUMS_LESSON_ID`). `combinatoricsChapter.ts`: section `row-sums` (4 paragraphs, formula, example, sl and en); comment updated. Examples avoid the lesson predictions: row 5 (32, alternating 0), hockey stick n=6, k=2 (1+3+6+10+15=35=C(7,3)), weight n=3, k=1, t=1/3 (4/9, about 0.444444). The n=0 alternating value is not stated, only that the argument does not apply there.
- Tests: `authoredChapterCoverage.test.ts` (count 194 to 195, row-sums maps to counting-tree), `familyChapters.test.ts` (combinatorics minimum 5), `lessonMathNotation.test.ts` (import, set entry, id list), `tests/unified-learning.smoke.spec.cjs` (combinatorics 5), `guidedExamplePreviews.test.ts` (`pending` row-sums, no copy row). No change needed in lookup/catalog/ownership files. `registration.ts` comment CB1 to CB5; `localization.md` row (izmenična vsota, hokejska palica, utež; handler-unreviewed); task 06 and README status. No change in `combinatoricsRowGuidedLessons.ts`.

### Outcome
- Red before source edit (`s3-red.log`): coverage and familyChapters failed (2). tsc clean (`s3-tsc.log`); `just unit src/learning src/graphs/combinatorics` passed (`s3-unit.log`); lint clean (`s3-lint.log`); build and `just smoke-lesson counting-tree` passed.
- Backslash checks: bscheck flags only String.raw lines; rawcheck's 12 are `\'` apostrophes.

### Not verified
- No browser look at the new section; Slovenian prose unreviewed; full unified-learning smoke not run. Pre-existing: `localization.md` Pascalova identiteta row shows "inom" (lost backslash), untouched.
