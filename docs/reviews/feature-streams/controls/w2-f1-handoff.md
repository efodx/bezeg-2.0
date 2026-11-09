# W2 F1 handoff (partial)

Closed: see `w2-f1.md` (all items below were completed there).

Source edits are done for all 9 graphs and typecheck clean for my files (`just typecheck`: only other workers' Epicycle/Fourier test errors). `just lint` on the 9 graph files passes. My files were never in `controlExemptions`/`uncaughtSteppers`, so no eslint.config.mjs edit was needed (the diff there is another worker's).

## Done (source)
- Binomial/Density: fit button + keys `prob_*_fit_view` removed; `fitView` overrides frame fitBinomialNormalView/fitDensityView; `FunctionStatus` used.
- CLT/Summary: private notice -> `guard(this.refusals, ...)`; `FunctionStatus`; Summary Add value = `UnavailableButton` (reason = full message, blocked press refuses).
- Correlation/Summary drag: clamp to limit, no notice (decision 3).
- Correlation, ConicFocal, Darboux, LeastSquares: `FunctionStatus`. LeastSquares `data-lsq="reason"` is a status line (data state, not a refused edit); moved from controls to renderReadout.
- Linear k/n: `unavailableReason` (vertical/degenerate notes reused). Conic: weight Slider `unavailableReason`, matched-weight `UnavailableButton`; new keys conic_weight_needs_bridge / conic_weight_already_matched (sl+en). Darboux: n -> `CountSetter` (onPlus/onMinus/onSet), Refine -> `UnavailableButton`.
- No grid snaps added: none of my models refuse off-grid typed values (checked Linear, Darboux, Density, Binomial).

## Not done / failing (last run `.command-logs/w2-f1-unit3.log`)
1. `CltGraph.host.test.tsx` 3 tests (refused edits: all-zero shape, Reset clears notice, import clears notice) read the old in-status `data-prob-clt-status="refused"`; switch them to `[data-refusal-notice]`.
2. `CorrelationGraph.host.test.tsx` language test (~line 503): my replacement (extra `minusButton()` expecting /must be from 2 to 20/) fails; the count refusal is likely on CountSetter's own minReason, not the channel. Use a typed-edit refusal instead.
3. `DarbouxGraph.host.test.tsx` "real board" test still fails after the selector fix; read the log (Refine is now aria-disabled, not `disabled`; n is a CountSetter).
4. Not yet written: thin wiring checks per graph (shared control mounts and one edit reaches model) for CLT/Summary/Conic/Linear; Linear/Conic/Summary tests of the reasons; Binomial test for Fit (exists, run passed); lesson unit tests (`grep -rl <graph id> src/learning`) not run; the Epicycle-style FunctionStatus line in `FunctionReadout.css` not touched; no pre/post test-time delta, no mutation evidence; evidence file w2-f1.md not written; en/sl unused-key check for removed keys done only for fit_view.
