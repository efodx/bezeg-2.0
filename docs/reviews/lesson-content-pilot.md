# Lesson content pilot: results for owner review

[Spec](../specs/lesson-content-pilot.md) · [style brief v2](lesson-content-pilot/style-brief.md) · [reviewer brief](lesson-content-pilot/reviewer-brief.md) · 2026-11-08

Four lessons were rewritten in Slovenian through blind persona review (struggling, curious and reluctant student, three fresh reviewers per round). This is text only: nothing has been checked in the browser and nothing in `src/` has changed.

## Scores

Mean weighted score out of 27, with motivation and narrative counted twice. Motivation is shown per persona (struggling/curious/reluctant).

| Lesson | Current (r0) | Round 2 | Round 3 | Final version | Final motivation | Stop rule |
| --- | --- | --- | --- | --- | --- | --- |
| `bezier-pilot` | 14.7 | 21.7 | 22.0 | r2 | 2/2/3 | cap reached |
| `subdivision-guided` | 14.0 | 19.7 | 19.3 | r2 | 2/2/2 | cap reached |
| `curve-curvature-guided` | 16.0 | 20.7 | 22.7 | r2 | 3/3/2 | cap reached |
| `polynomial-zeros-guided` | 14.3 | 24.3 | — | r1 | 3/3/3 | **met** |

Every current lesson scored 1 on motivation from all three personas. Each opens with a definition and ends on the generic "Končni prizor je pripravljen".

## What changed, lesson by lesson

Steps were restructured, so a line-by-line table would mislead. Read the full scripts side by side: current `scripts/<id>.r0.md` against proposed `scripts/<id>.<final>.md`. The change logs in `lesson-content-pilot/changes/` tag every edit as **[besedilo]** (text only) or **[struktura]** (step, frame or scene change), with its reason.

### bezier-pilot: 6 → 4 steps ([current](lesson-content-pilot/scripts/bezier-pilot.r0.md) · [proposed](lesson-content-pilot/scripts/bezier-pilot.r2.md))

- **Opening now:** "Kontrolne točke določajo krivuljo; pri njihovem premiku se nekatere geometrijske lastnosti ohranijo."
- **Opening proposed:** "Črke v računalniških pisavah in poteze orodja »pero« v risalnih programih rišejo Bézierjeve krivulje. Vsaka ima štiri kontrolne točke. Skozi koliko od njih gre krivulja in kam sploh sme?"
- **Steps:** Krivulja in njene točke → Kam krivulja ne more → Zakaj krivulja ne more ven → Odgovor in izziv.
- **[struktura]**
  - The endpoint and influence steps are merged into drag tasks.
  - The Bernstein-weight sentence and the hull set formula are removed; the hull becomes a rubber band the student tries to escape.
  - The evaluation at \(t=1/2\) becomes the answer to "why can't it get out".
  - The calculation frame moves after the experiment.
  - The final challenge: swap \(p_1\) and \(p_2\) to make a loop.

### subdivision-guided: 5 → 4 steps ([current](lesson-content-pilot/scripts/subdivision-guided.r0.md) · [proposed](lesson-content-pilot/scripts/subdivision-guided.r2.md))

- **Opening now:** a statement of the result, with how the control points are read from the scheme.
- **Opening proposed:** "Risalni programi krivuljo razrežejo, da lahko urejajo samo del oblike ali iščejo presečišča kos za kosom. Ali lahko Bézierjevo krivuljo razrežeš na dva kosa … ne da bi se oblika spremenila?"
- **Steps:** Kje je meja med kosoma → Rez → Rez, ki ni na sredini → Odgovor in izziv.
- **[struktura]**
  - Scenes no longer cut in advance: the student predicts, then presses Subdiviziraj.
  - The slider-range and reset admin is dropped.
  - The coordinate hunts are replaced by locating the joint.

### curve-curvature-guided: 7 → 6 steps ([current](lesson-content-pilot/scripts/curve-curvature-guided.r0.md) · [proposed](lesson-content-pilot/scripts/curve-curvature-guided.r2.md))

- **Opening now:** a definition of \(\kappa\), the osculating circle and the Frenet frame.
- **Opening proposed:** "Ta krivulja se na začetku zavije bolj kot na koncu. Zakaj? In kako zavoj izmeriš s številom? Pri cestah in železnicah …"
- **Steps:** Kateri konec se bolj zavije? → Tangenta se obrača → Krivinska krožnica → Zakaj je začetek bolj zavit? → Ko zavoj preide v drugo smer → Odgovor in izziv.
- **[struktura]**
  - The parabola step and the endpoint-formula step are removed and replaced by "drag the third control point and watch \(\kappa\) at \(t=0\)".
  - The inflection step starts at \(t=0{,}2\) so the answer is not shown in advance.
  - Answers move out of the "Napovej …" prompts into the reveals.

### polynomial-zeros-guided: 7 → 6 steps ([current](lesson-content-pilot/scripts/polynomial-zeros-guided.r0.md) · [proposed](lesson-content-pilot/scripts/polynomial-zeros-guided.r1.md))

- **Opening now:** a single paragraph of all the rules with the product formula.
- **Opening proposed:** "Graf polinoma \((x+2)(x-1)^2\) pri eni ničli prebije os \(x\), pri drugi pa se je le dotakne. Ali to lahko napoveš že iz zapisa, še preden pogledaš graf?"
- **Steps:** Katera ničla prebije os? → Preizkus domneve → Zakaj se graf dotakne? → Preberi graf iz zapisa → Konca grafa → Odgovor in izziv.
- **[struktura]**
  - The student merges the zeros by hand instead of seeing a pre-moved scene.
  - The triple-zero scene, the \(p''\) aside and the y-intercept step are removed.

## What makes lesson text good: the style brief

The [style brief](lesson-content-pilot/style-brief.md) has 14 rules. These moved scores the most:

1. A hook question comes first, and the last step answers it literally ("Zato, ker …", "Da, …").
2. Predict → act → reveal, with the answer only behind "Kaj bi morali opaziti", never in the prompt.
3. The effect comes before the formula, at most one formula per screen, and derivations go in an optional calculation frame.
4. Say exactly what to touch and where it is on screen.
5. One real-world use, stated early.

## Still failing at the cap

- **Explain before predict:** bezier steps 2–3 and subdivision step 2 still explain the idea before asking for a guess (4e and 4b).
- **Subdivision:** the worked-example frames ("prve točke vrstic", \(L(u)\), \(R(u)\)) and the "predzadnja točka" challenge are hard to follow. The reluctant persona would quit at step 4.
- **Curvature step 5:** the sign of \(\kappa\), the inflection point and the transition curve (prehodnica) are three ideas in one step.
- **No next step:** no lesson's last step points to the next lesson. Text can fix this by naming the next lesson; a runtime link would be better.

## Decisions for the owner

1. **Approve the voice?** If you do, the style brief becomes `docs/lesson-writing-guide.md` and the bar for all lesson text.
2. **Accept the dropped content?** Removing these takes some learning goals out of the lessons:
   - bezier: the Bernstein-weight formula and the hull set formula
   - curvature: the endpoint formula, the parabola numbers and the Frenet frame name
   - zeros: the y-intercept, the second-derivative test and the triple-zero scene

   The alternatives are optional calculation frames or follow-up lessons.
3. **Runtime proposals:** a lesson-specific closing line on the finish screen, which would replace the generic "Končni prizor je pripravljen" that capped every ending score at 2; a next-lesson link; and highlighting the readout a step refers to.
4. **A defect in the shipped lesson, independent of the pilot:** the current curvature reveal "Bližje ko je srednja točka krivulji, večja je ukrivljenost v temenu" is false, because the vertex curvature is \(1-c\), which grows as the middle point moves away. Its prompt also asks for a maximum that does not exist. Details are in [the curvature change log](lesson-content-pilot/changes/curve-curvature-guided.r1.md).

## Before anything is applied

The proposals assume UI facts that have not been checked in a browser:

- whether points are labelled \(p_i\) or \(P_i\)
- where the Subdiviziraj button and the \(t\) slider sit
- the scheme and hull colours
- whether the subdivided pieces' control points can be dragged
- the frame order explanation → observation → calculation

Applying a lesson means:

- source edits, with scene changes kept within the existing actions
- English in lockstep
- `lessonMathNotation.test.ts`, `tsc` and the build
- a smoke test of each changed lesson
