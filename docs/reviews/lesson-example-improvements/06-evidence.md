# Task 06 evidence: function example sequences

Files changed: `src/learning/content/functionGuidedLessons.ts` (trig, area), `src/learning/content/analysisGuidedLessons.ts` (taylor only), `functionGuidedLessons.test.ts`, `analysisGuidedLessons.test.ts`. Review of the content edits found no defects; only tests needed updating (they were stale).

## Scenes and intended observations

Trigonometric functions (7 steps, was 5; baseline `A=1, omega=1, phi=0, B=0`):

| Step | Scene | Inputs (changed quantity only) | Observation |
|---|---|---|---|
| 1 | trig-default | none | sin x, range [-1,1], T=2pi |
| 2 | trig-amplitude-two | A=2, reference on | 2 sin x, range [-2,2], T and shift unchanged |
| 3 | trig-vertical-shift-one | B=1, reference on | sin x + 1, midline y=1, range [0,2] |
| 4 | trig-frequency-two | omega=2, reference on | sin 2x, T=pi, range unchanged |
| 5 | trig-sine-shifted-by-half-pi | phi=pi/2, reference on | shift -pi/2 (left); prompt asks phi=-pi/2 (right) |
| 6 | trig-worked-example | A=2, omega=2, phi=pi/2, B=1 | range [-1,3], T=pi, shift -pi/4 |
| 7 | trig-tangent-scene | tan | asymptotes, unchanged |

Area between curves (5 steps): 1 between, a=1, b=3 (14/3); 2 under-g, a=1, b=3 (shaded 16/3, int f = 2/3, difference 14/3); 3 default bounds 2-+sqrt(1.5) (4.899); 4 [0,4] (signed 4/3, area 8.4646); 5 [1,3.5] (signed 55/12 = 4.5833, area 4.9823).

Taylor (8 steps, was 7): new step 2 `taylor-exp-low-degrees-step`, scene `taylor-exp-low-degrees-scene`: degree 2, bound hidden, x=1, c=0; prose compares n=1,2,3 (errors 0.7183, 0.2183, 0.0516; T_2(1)=5/2) before n=6 in the exp step (bound shown; M=e<3 hypothesis kept, error 0.000226 < bound 0.000539). Later sine, geometric, flat steps and their qualifications unchanged.

## Numeric checks (all in the unit tests; pass)

- Trig: for each of steps 2-5 the scene actions set exactly one parameter (A; B; omega; phi); `valueRange` [-2,2], [0,2], [-1,1], [-1,1]; `period` 2pi, 2pi, pi, 2pi; `phaseShift` 0,0,0,-pi/2; `trigValue` equals 2 sin x, sin x + 1 (difference exactly 1 at six x), sin 2x (pi-periodic), sin(x+pi/2); `phaseShift` for phi=-pi/2 is +pi/2 and for omega=2, phi=pi/2 is -pi/4.
- Area: signedBetween(1,3) = unsignedBetween(1,3) = 14/3; integralG 16/3, integralF 2/3; intersections [0.7753, 3.2247] (= 2-+sqrt(3/2)); [0,4] signed 4/3 vs area 8.4646; [1,3.5] signed 55/12 vs area 4.9823; swapped endpoints: signedBetween(3,1) = -14/3, signedBetween(3.5,1) = -55/12, unsignedBetween unchanged, signedBetween(4,0) = -4/3 (new assertions: [1,3.5] and [3,1]).
- Taylor (repo `taylorPolynomial`/`taylorAbsoluteError`, e^x, c=0, x=1): T_1..T_3,T_6 = 2, 5/2, 8/3, 1957/720; errors 0.71828, 0.21828, 0.051615, 0.000226, strictly decreasing, each at most e/(n+1)!; prose of the new step and exp step contain the stated values (EN and SL decimal commas).

## Mutation checks (each failed the intended test, then restored)

Scene B 1->1.5; omega 2->3; extra B action in the amplitude scene; under-g scene losing a/b; Taylor low-degree scene revealing the bound; Slovenian prose error value 0,2183 -> 0,2185; `phaseShift` sign flipped; `unsignedBetween` without `abs`; `taylorAbsoluteError` halved. All nine caught (the sign flip and abs mutations by the numeric tests; the others by action/prose tests).

## Commands and results

- `npx vitest run src/learning/content/functionGuidedLessons.test.ts src/learning/content/analysisGuidedLessons.test.ts src/learning/content/lessonMathNotation.test.ts src/learning/content/sceneContentAgainstGraphs.test.tsx`: 4 files, 163 tests passed.
- `npx tsc --noEmit --pretty false`: no errors.
- Generic bounds raised: function lessons now allow up to 7 steps, analysis lessons up to 8.

## Gaps

- No browser/Playwright, no build run. Smoke test rows in `tests/guided-lessons.smoke.spec.cjs` are NOT updated and will fail until the changes in `06-smoke-changes.md` are applied (trig equation strings for amplitude/vertical shift/frequency are inferred from the readout format).
- The claim that the dashed reference stays fixed and readouts match the formulas (range/period/shift readouts, slider ranges for A, B, omega, phi accepting the scene values) is verified by `sceneContentAgainstGraphs` for value validity only, not visually.
- Another worker edits other analysis lessons; the generic analysis step bound (8) was set for taylor's 8 steps.
