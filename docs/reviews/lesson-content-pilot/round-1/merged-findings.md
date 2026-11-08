# Round 1: merged findings

Twelve blind reviews (three personas × four lessons) of the r0 scripts. The handler merged them.

## Scores (weighted, out of 27)

| Lesson | Struggling | Curious | Reluctant | Mean |
| --- | --- | --- | --- | --- |
| bezier-pilot | 15 | 15 | 14 | 14.7 |
| subdivision-guided | 13 | 15 | 14 | 14.0 |
| curve-curvature-guided | 15 | 18 | 15 | 16.0 |
| polynomial-zeros-guided | 14 | 15 | 14 | 14.3 |

The personas agree within 3 points, so no calibration correction is needed. Motivation and narrative scored 1 in all twelve reviews.

## Shared findings (all lessons)

1. **No hook.** Every lesson opens with a definition or a list of results ("Kontrolne točke določajo krivuljo…", a five-rule paragraph in polynomial zeros, "Frenetov koordinatni sistem" in curvature). No persona could say why they should care.
2. **No payoff and no recap.** Every lesson ends with the generic "Končni prizor je pripravljen". Nothing answers an opening question and there is no next challenge.
3. **Formula before experience.** Recurrences, Bernstein weights, \(\kappa\) formulas and derivative tests arrive before the student has seen the effect on the graph. All three reluctant quit points are formula walls: bezier step 2, subdivision step 3, curvature step 5 and zeros step 3.
4. **Answers spoiled inside prompts.** "Napovej …" is immediately followed by the value (curvature steps 2 and 4; zeros step 1). The hidden "Kaj bi morali opaziti" reveal exists but goes unused for its purpose.
5. **Vague or missing actions.** "Izberi lastnost, ki jo boš preveril", "Določi …" and "premakni točko" never say which point to move, what to watch, or what number to read. Merging zeros is described in prose rather than asked as an action.
6. **Coordinate and number recitals.** Fraction lists (subdivision step 3, bezier step 4) that the student should read off the screen instead.
7. **Interface admin in prose.** Slider ranges, "t se postavi na 1", the scheme hiding itself (subdivision step 5).
8. **Tangents.** The \(x=-1\) aside and \(p''\) in zeros step 3, the y-intercept formula in zeros step 6, and the endpoint formula in curvature step 5. Each adds an idea that the thread does not need.

## Lesson-specific hooks the reviewers proposed

- **bezier:** "Krivulja ne gre skozi svoje točke. Kako si potem izbere pot? Kam ne more?"
- **subdivision:** "Ali lahko krivuljo razrežeš na dva kosa, ki sta spet Bézierjevi krivulji, ne da bi se oblika spremenila?"
- **curvature:** "Zakaj se začetek krivulje zavije bolj kot konec, in kako to izmerimo s številom?" The current step 1 already raises this but never answers it.
- **zeros:** "Zakaj graf pri eni ničli seka os, pri drugi pa se je le dotakne? Ali to vidiš že iz enačbe?"
