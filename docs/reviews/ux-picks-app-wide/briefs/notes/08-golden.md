# 08 golden (worker notes)

- Record run: 125 files, 179.7 s (each demonstration recorded twice for determinism). Log: 08-golden-record.log (just's wrapper), stats: 08-golden-stats.cjs.
- Check runs: 103.8 s and 104.3 s, both pass (08-golden-check1/2.log).
- Red check: function-inverse `PRECISE` 4 -> 3 temporarily; failure text in 08-golden-red.log; restored (git diff empty).
- 60 demonstrations show no rows, notes or outputs in any state (golden holds captions only); 25 record a single state.
- `just graph-check function-inverse`: golden passes; contract, parity and declaration rows FAIL as expected (graph not yet declared/recorded).
