# RK evidence
- Unit: `just unit src/inputs src/graphs/base src/graphs/curves` (log .command-logs/w2-rk-all.log): one failure (PhOffsetControls toBeDisabled), fixed to aria-disabled and re-run green. Runge host test updated per handler. Typecheck: only CltGraph.host.test.tsx (RF) errors.
- Mutations observed failing: BooleanField ignoring-change guard removed; Rational min/minReason removed; skip boardUpdate (G1 junction test); skip refit (2 refit tests).
- Not mutation-verified: rational weights kept, refit-inside-no-change, Blossom host reset, multi-curve title (fail by construction pre-change), arc-length descriptions.
- Decisions: no selection lists curve 1 and names it "Krivulja 1: točke". Runge reason = existing help text.
