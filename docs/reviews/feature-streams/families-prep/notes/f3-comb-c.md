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
