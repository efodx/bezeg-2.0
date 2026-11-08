# Round 2: merged findings

Twelve blind reviews of the r1 scripts. Reviewers were fresh and did not see r0.

| Lesson | Struggling | Curious | Reluctant | Mean (r0 mean) | Motivation |
| --- | --- | --- | --- | --- | --- |
| bezier-pilot | 21 | 22 | 22 | 21.7 (14.7) | 2/2/2 |
| subdivision-guided | 19 | 20 | 20 | 19.7 (14.0) | 2/2/2 |
| curve-curvature-guided | 19 | 22 | 21 | 20.7 (16.0) | 2/2/2 |
| polynomial-zeros-guided | 23 | 25 | 25 | 24.3 (14.3) | 3/3/3 |

**polynomial-zeros-guided meets the stop rule** (motivation 3 from every persona, no dimension below 2). It is frozen at r1.

## Remaining findings

1. **Not anchored to the screen** (struggling, all lessons). Text names readouts, buttons and parts of the scheme without saying where they are or how to recognise them: curvature's "izpisuje \(\kappa\) in \(R\)", subdivision's "gumb Subdiviziraj" and "levi rob sheme", bezier's "vleče".
2. **Purpose (4c).** Subdivision never says why anyone cuts a curve. In bezier and curvature step 2, the reluctant reviewer cannot say why they should care.
3. **Payoff (4d).** The curvature recap restates the measurement instead of answering the opening "Zakaj?".
4. **Generic Konec screen.** "Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem" follows every lesson, which caps the ending score at 2 in every review. This is app chrome, so text cannot fix it. It goes to the runtime proposals.
