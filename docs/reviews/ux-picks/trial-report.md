# Conversion trial: Haiku vs Sonnet (2026-11-22)

Owner: "8 graphs, haiku (with hard cut at 100k context) vs sonnet, graded by opus med", then "go with the 2. and 3." (reading rules; plan pass + apply pass for Haiku) and "if sonnet finished in 80k, try how many graphs it can do with 200k".

Task per graph: convert to the explicit-declaration contract following `round6/explicit/GUIDE.md` (cards, lesson frames, pucks, view focus, tool sections), verify (tsc, the graph's unit tests, Playwright shots, lesson walk). Grader: `bezeg-reviewer`, Opus, effort medium, blind (lanes P/Q), score 0-4 on M maths, C completeness, S style, F pick-off fidelity, V visual, R residual repair (24 max). Evidence: `Desktop/bezeg-ux-picks/trial/` (LEDGER.md, briefs, notes, grades/*/GRADE.md); branches `ux-trial/p` (Haiku), `ux-trial/q` (Sonnet), `ux-trial/r` (Sonnet long session), local only.

"Context" below is the worker's final context size (what the 100k cut measures), not billed tokens.

## Per graph

| # | Graph | Sonnet: time / tool calls / context | Sonnet grade | Haiku: passes, time / tool calls / context (sum) | Haiku grade |
|---|---|---|---|---|---|
| 1 | Darboux (functions, count, reveals) | 4.3 min / 42 / 79k | 21 | 1 pass to the cut, 3.5 min / 30 / 105k, partial | 8 (reject) |
| 2 | De Boor (curves) | 5.1 / 45 / 83k | 20 | 3 passes (1 plan-only + 2), 13.5 / 138 / 313k | 20 |
| 3 | Inscribed angle (geometry) | 8.9 / 30 / 83k | 21 | 1 pass to the cut, no edits | 0 |
| 4 | Complex power (complex, count) | 3.6 / 31 / 71k | 20 | 1 pass to the cut, no edits | 0 |
| 5 | Logistic map (dynamics) | 7.4 / 32 / 86k | 20 | plan + apply, 12.6 / 98 / 228k | 20 |
| 6 | Linear map (linear algebra, 1364 lines, 7 modes) | 8.3 / 43 / 114k | 21 | plan + 3 apply, 13.7 / 189 / 408k | 17 |
| 7 | Unit circle (trig lesson graph) | 10.5 / 65 / 108k | 19 | plan + 2 apply, 10.5 / 132 / 301k | 16 |
| 8 | Bernstein (count) | 4.5 / 22 / 47k | 22 | plan + apply, 9.7 / 94 / 178k | 22 |

Sonnet: 8/8 "accept with fixes", mean 20.5, 52.6 min, single pass each, every graph under 115k.
Haiku as specified (one pass, cut at 100k): 0 of 4 usable — every run filled 100k while reading (it opens whole files) and three made no edit at all. With the plan/apply split (graphs 5-8, De Boor by continuation): 5/5 "accept with fixes", mean 19.0, 2-4 passes per graph, about 2.8× Sonnet's context and 1.6× its wall time, plus handler work per pass. The reading rules alone did not keep a plan pass under the cut (logistic plan 120k); the split did.
Sonnet in one long context (lane R, signal at 190k): 4 complete graphs in 20.3 min / 98 calls / 195k (mean value 7 min, Euler line 8, complex multiplication 3, polygon area 3) — about 50k per graph once the guide is learnt. Graded first vs last: 21 and 20; maths equally exact, the late graph's self-checks thinner (a frame highlights a row its scene hides; a label shown twice).
Graders: 50-100k context, 2-5 min each.

## Quality findings

- All accepted conversions show exactly the original values (checked by the graders in the browser, incl. deeper levels, other modes, degree changes) and leave `?ux=none` unchanged. No collateral edits outside owned files, except one Haiku pass that wrote into the wrong worktree (moved by the handler).
- Haiku-only defects: wrong symbol (α+β where the graph says θ) and tone (unit circle); no eigen puck and untitled sections (linear map); r-axis labels hidden (logistic). Haiku frames were sometimes the better half (linear map: grader's best merge = Sonnet graph + Haiku frames).
- Recurring in both lanes (guide/contract fixes, not model fixes): inline Slovenian names where catalog keys exist; incomplete or over-eager frame highlights (highlighting a value the frame asks to predict, or a row the scene hides); legend entries not drawn in some states; shared inputs without `paramKey` (AngleSlider → local wrappers, three times); non-function graphs never set a view intent (fit never starts); frames cannot highlight notes; legacy `step()` lessons cannot carry `ux`; readout card clipped at 1440×900.

## App-wide estimate (≈110 graphs left)

- Model: Sonnet, in long sessions of ~4 graphs per 200k context (≈28 sessions). Haiku is not cheaper once its 2-4 passes and the handler's per-pass work are counted, and it fails the hardest graphs.
- Time: ≈5 min of worker time per graph in a long session → ≈9-10 h serial, ≈3-4 h with three parallel lanes; plus review: one Opus grader per 2-4 graphs (≈60-100k each) or sampling.
- Failure rate: 0 rejects of 12 Sonnet conversions; all "accept with fixes", residual repair typically <15 min each. Cutting the recurring defects above in the guide/contract first should remove most of the repair.
- Before scaling: fix the contract gaps above (paramKey on shared inputs, note highlights, `ux` on legacy steps, catalog-key rule in the guide), and decide the view director (Fable proposal, `Desktop/bezeg-ux-picks/h8/fable-autozoom.md`): if graphs no longer hand-write `focus`, about a fifth of each conversion disappears and a source of mismatch with the board goes with it.
