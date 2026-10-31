# 05 Batch B: coefficients as projections and coefficient decay (F2a–F6)

Gates: `G-FN` (F2a), `G-REG` (F2b–F6). Depends on 01 and 04 (Batch A released). Decisions: [ADR 0034](../../adr/0034-fourier-series-models-handles-and-closed-loop.md) §2.

- **F2a:** `FourierCoefficientsGraph` for F2 and F4: fixed-breakpoint handles (vertical drag, keyboard steps, jump layouts, seam midpoint shown), bar spectrum for \(k\le K\) (default 16), shaded signed product for a selected \(k\), partial-sum overlay, Parseval readout; F4's side-by-side spectra with a linear/log switch, reference curves, zero bars drawn as zero and "\(\log 0\) is not drawn" in the log view.
- Measure handle dragging with \(K=16\) and the overlay per the [performance plan](../../performance-plan.md) before choosing a drawing approach; record the threshold.
- Presets: handles and \(K\); F4's three selections and \(N\); malformed data rejected.
- **F2b–F6:** as in task 04, for lessons F2 and F4. F4's prose limits the decay theorem to the forward direction and does not claim the converse of the M-test.
