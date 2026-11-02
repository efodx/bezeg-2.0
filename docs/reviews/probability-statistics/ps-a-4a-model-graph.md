# PS-A-4a1/4a2: `prob-binomial-normal` model and graph (lesson P2), evidence

Source: [task plan](../../tasks/probability-statistics/README.md), [spec P2](../../specs/probability-statistics-lessons.md#p2-from-binomial-to-normal-od-binomske-k-normalni-porazdelitvi). Date 2026-11-03, curves handler 29. Not registered: no route, catalog entry, `graphFactories` entry or lesson. The Preset collection key `prob-binomial-normal` is new and listed in `PENDING_ROUTE_KEYS` of `PresetCatalog.test.tsx`.

## Files

- `src/analysis/binomialNormalModel.ts` (+ `.test.ts`, 52 tests; commit `c2b90da2`): model `{n, p, k, correction, poisson}`, check/parse/edit rules (issues are data), `binomialNormalView` (exact CDF from summed masses, normal with and without correction, Poisson, absolute errors, the same for P(X = k)), bars as one polyline, Poisson bars with the tail above n, fitted view.
- `src/graphs/functions/BinomialNormalGraph.tsx` (extends `BaseFunctionGraph`), `binomialNormalMessages.ts`, `BinomialNormalGraph.host.test.tsx` (20 tests).
- `functionPresetCollections.ts`: `prob-binomial-normal` with a diagnosis built on `checkBinomialNormalModel`.
- `sl.ts`, `en.ts`: `prob_binomial_*` keys in lockstep.

## Decisions

- \(n\in1..1000\) (`BINOMIAL_N_MAX`), \(p\in(0,1)\) open; \(p=0\) or \(1\) is refused with its own message (variance zero; handler 28). \(k\) integer in \(0..n\); lowering \(n\) below \(k\) moves \(k\) to \(n\) (an edit only; import rejects a stored \(k>n\)).
- Board, lowest first: shaded bars of \(P(X\le k)\), the dashed normal area from \(\mu-8\sigma\) to \(k+\tfrac12\) (correction on) or \(k\) (off), the bar outlines (one curve), the normal density, the Poisson bars (width 0.5, one curve with empty data while off), the point \(k\) at the centre of its bar (drag snaps to integers \(0..n\)), the caption. Seven generated objects at every \(n\).
- Fitted view: \(np\pm4\sigma\) and every bar with mass above \(10^{-6}\), one bar wider, cut to \([-1,n+1]\); the normal peak may leave the view when \(\sigma\) is tiny (capped at 1.5 times the highest bar).
- \(p\): slider 0.01..0.99 and a separate "exact value of p" field over \((0,1)\), four decimals.
- Probabilities show up to five decimals; trailing zeros are dropped (0,1841).

## Mutation checks (workers; observed failing, then restored)

Model: uncorrected value used for the corrected one (2 fail), no \(k\) move on lowering \(n\) (1). Graph: normal-area end ignores the correction (1), `syncSceneToModel` does not move \(k\) (3), Poisson curve always has data (1). The model's view test refuted the handler's first fitted view (\(np\pm4\sigma\) cut off bars above \(10^{-6}\)), fixed before commit.

## Review

Sonnet `bezeg-reviewer` (engineering, UI, spec P2): no blocking. Should-fix 1 (the p slider's own number field refused values outside 0.01..0.99 without a hint) fixed by the handler with `prob_binomial_p_slider_rejected`, pointing to the exact field. Should-fix 2 ("custom" example option) needs no change: `isBinomialNormalExampleId("custom")` is false, so choosing it is a no-op. Handler review fixes before that: the readout used an uncached `poissonBars`; the readout note's sentence on the correction reworded in both languages.

## Checks

On `c2b90da2` plus the diff: tsc, `just lint src/graphs src/analysis src/localization`, `just unit src/graphs/base/presets src/graphs/functions src/analysis src/localization` (181 s), `just check-localization`, `just build`. After the slider fix: tsc, lint, `check-localization`, the host test and `src/localization`.

## Gaps

- No browser check until registration (PS-A-4b). Fill shapes not yet inspected visually.
- Drawing performance at \(n=1000\) not measured (bars are 4004 points in one curve, the normal area 162 points).
