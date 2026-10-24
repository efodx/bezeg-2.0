# Math review: spline and parameterization lessons

Reviewer: independent mathematical review, read-only. Verification used throwaway node scripts in the job tmp dir (`sp.mjs`, `cn.mjs`, `ph.mjs`), reimplementing the constructions from the code's formulas, plus hand arithmetic.

## Result

No blocker, no major, no wrong number found. Minor items only.

## Lessons reviewed

- spline-cn: derived points, joint, q1 and q2 formulas, second-difference equality, locality claims, limitation scene. Recomputed all six derived points by blossom extrapolation: (0.5,-3) (4,-3.5) (-3,3.5) (-13.5,11) (18.5,-8) (61,-34.5). Norms 3.0 / 5.3, 4.6 / 17.4, 20.2 / 70.1 match "about 5 / 17 / 70". The free points have max distance 4.47 (<= 4.5), and the view [-20,15,70,-40] is 90 wide and contains all points. The edge case "n=4, r=3 over 150" holds (max norm 158.8).
- spline-c1: joint (0,2), tangent (2,0), second differences (0,-4) vs (-1,-3), formulas, and locality (p5 changes only the last piece; p2 changes pieces 1-3) all verified by hand.
- spline-c2: thirds (-1,-2) and (1,-1), joints (-2.5,-1) and (2.5,0), inner end points (-4,0) and (4,1), second difference (0.5,2) on both sides, 6 derived points, and 7-point locality (p0 -> piece 1, p6 -> piece 4, p3 -> all four) verified.
- spline-g1: q1 values, derivatives (8,-8), (2,-2), (20,-20), norms 11.31 / 2.83 / 28.28, ratios b, and the 3-piece chain (spans 1/3, factor 6; (6,6) -> (15,-3); q1 (-0.5,-0.5), q2 (4.5,-1.5) vs (1,-2), (3,0)) verified. Piece 1 is unchanged and pieces 2 and 3 change. Slider range [0.01,3] contains b = 2.5.
- spline-g1-symmetric: J for beta = 1/4, 1/2, 3/4, 0.99; derivatives (4,-2)/(12,-6), (12,-6)/(4,-2), (15.84,-7.92)/(0.16,-0.08); ratio (1-beta)/beta. Default points p2 = (-1,-3), p3 = (-1,3) give J2 from (-1,0) to (-1,1.5), and pieces 2 and 3 change. All correct.
- spline-parameterization: reimplemented the C2 construction (read from C2CubicBezierSpline.ts, tested for C1/C2 at the joints, residual about 1e-13). Chords 3.202 / 1.414 / 2.625 / 8.006 / 6.325, total 21.571, shares 0.066 / 0.371, J3 at alpha 0 / 0.5 / 1 = (-2.133,0) / (-2.845,0.094) / (-3.325,0.385), shift 1.2526, sample counts 2,2,2,2,2 and 1,1,1,4,3, gap ratios 5.06 / 3.53 / 2.85 (stated 5.1 / 3.5 / 2.9, computed over the 9 gaps between the 10 samples). All match. The shape does change with alpha (joints move, free points fixed), so the lesson is not a reparameterization of one curve.
- weighted-parameterization: phi_{1/4}(1/4,1/2,3/4) = (1/2,3/4,9/10), phi_{3/4} = (1/10,1/4,1/2), the simplifications 3t/(1+2t) and t/(3-2t), the symmetry, and the alpha = 0/1 collapse are correct. Samples are interior only (k = 1..N), consistent with the prose.
- uniform-parameterization: default PH curve w = [(-4.5,-4), (-1,0), (-4.5,4)], r' = w^2. Integrated with Simpson, independent of the repo: L = 1003/60 = 16.7167, sigma(0) = 36.25, sigma(1/2) = 7.5625, t = 0.149 / 0.5 / 0.851. Equal-arc N=3 arcs are 4.18 each and chords 4.18 / 3.91 / 3.91 / 4.18. N=10 arcs are 1.52 each; chords are 1.52 at the ends and 1.44 in the middle (5.3% shorter). Weighted alpha = 1/2, N=3 arcs 5.92 / 2.43 / 2.43 / 5.92. Weighted N=10 arcs run 2.81 to 0.69 (ratio 4.07). Prose equal-arc vs equal-chord distinction is correct.

## Minor findings

1. `splineGuidedLessons.ts` step `sp-chordal` observationPrompt: sl says "prve stične točke" (first joint) but en says "third joint". The data (J3) matches the en text. Expected: sl "tretje stične točke". Verified by reading both strings.
2. `splineGuidedLessons.ts` `g1s-ratio-example` (second worked example of spline-g1-symmetric): calculation uses J1-p1 = 3/4 (p2-p1), which is beta1 = 3/4, while the first worked example (`g1s-first-junction`) is beta1 = 1/4. The pairing with step 3 (beta 3/4) is right and the arithmetic is right, but the example never states beta1 = 3/4. A learner reading it after the beta = 1/4 example may see a contradiction. Expected: state beta1 = 3/4 in the example. Verified by hand.
3. `sp-spans` notation says Delta p_i are "differences of consecutive control points", but the first and last spans are |p0p2| and |p5p7| (C2CubicBezierSpline `knotSpans`). The explanation mentions p_{-1} and p_{m+1}, which is correct for the thesis indexing but opaque. Imprecision only; the numbers are right.
4. `parameterizationGuidedLessons.ts`: scene ids `up-weighted-ten` (3 samples) and step id `up-uniform-twenty` (10 samples) do not match their content. The content is right.
5. The 3.91 vs 4.18 chord deficit is 6.5%, stated "about 6%". Acceptable.
6. `wp-density-ten` and `wp-quarter-calculation` observations ("gaps near P3 small", "second half of the curve") hold in parameter terms (phi' is decreasing). The spatial claim depends on the default Bezier curve speed. I did not compute it.

## Not reached

- Tests (`splineExamples.test.ts`, `splineG1Examples.test.ts`, `splineParameterizationExamples.test.ts`, `parameterizationGuidedLessons.test.ts`) were NOT read. Non-vacuity was not assessed independently. The evidence files claim mutation kills (04: M1-M11 plus g1 mutations; 05a: six mutations; 05b: 12 of 12), which I did not rerun.
- The Newton tolerance claim (error below 1e-6 L for N = 1..40) was not independently verified; my Simpson check only confirmed N = 3 and N = 10 arcs to 2 decimals.
- Diff hunks against 791af6e were generated (tmp `spl.diff`, `par.diff`) but I read the current file content, not the diffs.
- Fully line-by-line sl vs en agreement was checked only for the numbers in the strings I read. I did not read the sl strings of the alpha-spline sp-default beyond the numbers, nor the weighted-lesson source/edge-case sections (lines 183-215) or the uniform lesson edge cases (after line 372).
- The thesis-figure references (Figure 23, 29) were not checked.
