# 03 Batch A graph: partial sums and Gibbs (F2a)

Gate: `G-FN` (the graph adds a function model). Depends on 01. Decisions: [ADR 0034](../../adr/0034-fourier-series-models-handles-and-closed-loop.md) §1. Re-read Platform A7's single-owner rules (validity, normalization, structured diagnosis) first.

- `FourierSeriesGraph` and its model/parse file for F1 and F3: example (square wave, sawtooth), integer \(N\) in a closed range with a rejection hint (no silent rounding; even \(N\) for the square wave equals \(N-1\)), point readout of \(S_N(x)\) and \(|f-S_N|\), jump marker with one-sided limits, Gibbs peak marker at \(\pi/(N+1)\) with value and overshoot, zoom window following the peak, \(\varepsilon\) band.
- Sampling: at least 8 points per period of the highest harmonic; a test compares the drawn maximum to the closed-form peak.
- Readouts localize decimal points to a decimal comma (and `{,}` in math).
- Presets: example, \(N\), point, \(\varepsilon\); malformed data rejected with an actionable message. Unit and component tests only, no route.
- `UniformConvergenceGraph` and its Presets are not touched.
