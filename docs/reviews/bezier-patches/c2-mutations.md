# Mutation evidence — C1b graph tests and C2a (2026-10-27)

Runner: Haiku worker (`.command-logs/mut-run*.out`, `mut-<n>.log`), backups restored and `git diff --stat` matched the start. Handler reran 5 and 15 after strengthening tests (`.command-logs/h10-*`).

| n | mutation | killed | by |
|---|---|---|---|
| 1 | movePoint writes old position | yes | TensorPatchGraph.test point move |
| 2 | camera edit bumps revision | yes | camera edit no-bump |
| 3 | raise without exact elevate | yes (4) | degree raise tests |
| 4 | lower perturbs a corner | yes | lower keeps corners |
| 5 | export omits camera | yes after handler fix | export round-trip now edits and compares the camera |
| 6a/6b | double / skipped view dispose | yes | single dispose |
| 7 | attach rejection swallowed | yes | attach rejection |
| 8 | no highlight-col | yes (3) | patchSceneBuilder highlight tests |
| 9 | Bernstein without binomial | yes (4) | weight / partition of unity |
| 10 | inset drag does not set parameters | yes | inset drag → state |
| 11 | auxiliary board not freed | yes (3) | GraphSession auxiliary board |
| 12 | syncInset no-op | yes | state → inset |
| 13 | selectPoint no revision bump | yes | highlight redraw |
| 14 | az/el degrees used as radians | yes | az/el control ↔ camera |
| 15 | editor drops its finite check | **survives** | jsdom sanitizes invalid `type=number` input to `""`, so the empty check catches every reachable invalid entry; `movePoint` also rejects non-finite values. Accepted as defense in depth; the alert assertion now runs per invalid entry. |
