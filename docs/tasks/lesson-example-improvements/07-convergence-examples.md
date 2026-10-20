# 07. Start convergence with a visible successful comparison

**Source spec:** [Batch C](../../specs/lesson-example-improvements.md#batch-c-parameterization-and-example-sequences)

**Status:** planned. **Dependencies:** none. **Lessons:** `sequence`, `uniform-convergence`.

## Work

- Sequence: open with \(1/n\), limit \(0\), \(\varepsilon=1/4\), and twelve visible terms. Show the boundary term \(n=4\) and the inside tail starting at \(n=5\). Choose the displayed \(N\) according to the implementation's documented \(n\ge N\) or \(n>N\) convention; update the worked calculation and certificate consistently.
- Tighten epsilon afterward, retaining the current smaller-band example that requires reasoning beyond the visible terms. Keep alternating-reciprocal, alternating-sign, and unbounded contrasts and prediction-before-certificate behavior.
- Uniform convergence: begin with the existing \(x/n\) example on \([0,1]\). Compare pointwise error and supremum error \(1/n\); then contrast \(x^n\) on \([0,1]\), and finally on \([0,0.8]\). Retain the near-one restricted interval as later exploration.
- Explain the endpoint limit and nonattained supremum correctly for \(x^n\) on the full closed interval. Preserve reveal controls and learner prediction rather than revealing all conclusions during setup.

Entry points: `src/learning/content/analysisGuidedLessons.ts`, `src/analysis/sequence.ts`, `sequenceModel.ts`, `uniformConvergence.ts`, `uniformConvergenceModel.ts`, and both graph adapters. Coordinate content-file writes with task 06.

## Acceptance and checks

- Verify \(1/4\) lies on the open-band boundary, \(1/5<1/4\), and all displayed inside/outside classifications and tail certificates use the same strict inequality and tail convention.
- A finite set of inside terms is not presented as proof of convergence; a loose epsilon band containing \((-1)^n\) is not presented as convergence.
- Check \(\sup_{[0,1]}|x/n|=1/n\), and \(0.8^{11}<0.1\) while \(0.8^{10}>0.1\).
- For \(x^n\) on \([0,1]\), the pointwise limit is zero below one and one at one; the supremum error is one and is not attained. The display must not use the endpoint's zero error as the supremum witness.
- Verify iteration/reveal/threshold controls, synchronous multi-action scenes, exit/restore, and bilingual content. Run focused numerical/content/scene tests, notation tests, typecheck/build, and affected browser workflows.
