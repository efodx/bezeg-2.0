# Task 07 evidence: convergence examples

**Status:** implemented 2026-10-24; browser acceptance pending (task 09). Worker findings: [07-handoff.md](07-handoff.md).

## Conventions checked in code

- `src/analysis/sequence.ts`: tail \(n\ge N\), strict open band \(|a_n-L|<\varepsilon\). At \(\varepsilon=1/4\), \(a_4=1/4\) is on the boundary (outside), \(a_5=1/5\) inside, least \(N=5\).
- `src/analysis/uniformConvergence.ts`: examples `scaled` (\(x/n\), default \(r=1\)) and `power` (\(x^n\), default \(r=0.8\)). All scenes use existing actions.

## Scenes

| Lesson | Step | Inputs | Intended observation |
| --- | --- | --- | --- |
| `sequence` | 1 | \(1/n\), \(\varepsilon=0.25\), 12 terms, certificate hidden | \(n=4\) on the boundary, tail inside from \(n=5\); predict before revealing |
| `sequence` | 2 | \(\varepsilon=0.1\), \(N=11\) | tightening the band moves \(N\) |
| `sequence` | 3–7 | unchanged (\(\varepsilon=0.01\), alternating, \((-1)^n\), unbounded, free) | retained contrasts |
| `uniform-convergence` | 1 | `scaled`, \(n=4\), \([0,1]\), supremum hidden | supremum error \(1/n=1/4\) at \(x=1\); pointwise error at \(0.5\) is \(0.125\) |
| `uniform-convergence` | 2–3 | `power`, \(r=1\), \(x=0.9\), \(n=5,10\) | limit jumps at \(x=1\); supremum error 1, not attained; the endpoint's zero error is no witness |
| `uniform-convergence` | 4–6 | `power`, \(r=0.8\), \(n=2,5,11\) | restricted interval converges uniformly; shared \(N=11\) at \(\varepsilon=0.1\) since \(0.8^{11}<0.1<0.8^{10}\) |
| `uniform-convergence` | 7–8 | near-one domain, free exploration | retained later exploration |

## Checks

- Unit tests in `analysisGuidedLessons.test.ts` use the repo's analysis functions: band classification at \(\varepsilon=1/4\) up to \(n=1000\); \(\sup|x/n|=1/n\) on a grid; \(0.8^{11}<0.1<0.8^{10}\); \(x^n\) on \([0,1]\) has limit 0 below 1 and 1 at 1 with supremum 1 not attained.
- Handler mutation run (`mutate07.py`, file restored after each): \(\varepsilon\) 0.25→0.3, 12→10 terms, uniform \(n\) 4→5, `scaled`→`power` each fail one test.
- `npx vitest run` on `analysisGuidedLessons`, `lessonMathNotation`, `sceneContentAgainstGraphs`: 129 passed (worker); `npx tsc --noEmit --pretty false`: clean (handler).
- Smoke rows for `sequence` and `uniform-convergence` updated by the handler; not yet run.

## Gaps

Browser behavior (readouts, reveal timing, both languages, 390 px) is unverified until task 09.
