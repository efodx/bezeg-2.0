# 0031 Probability convolution: sampled density with direct trapezoid convolution

Status: accepted, 2026-10-31 (handler 4, after mathematical review). Context: [Probability and statistics on the graph](../specs/probability-statistics-lessons.md#decisions-needing-an-adr) (decision 2), [ADR 0027](0027-probability-demonstration-family.md), [performance plan](../performance-plan.md), evidence in [ps-1b-kernel.md](../reviews/probability-statistics/ps-1b-kernel.md).

## Context

P3 (the central limit theorem without randomness) needs the density of the sum of \(n\) independent copies of a base density for \(n\le30\), the standardized curve, its cumulative function and the Kolmogorov distance from the standard normal law. The base density is a piecewise-linear shape with draggable heights, so the recomputation runs while the student drags and must fit the 16 ms frame of a 60 Hz display. The spec lists three representations: (a) a sampled density on a uniform grid with trapezoid weights and direct \(O(m^2)\) convolution; (b) FFT convolution; (c) exact piecewise-polynomial convolution of piecewise-linear inputs.

The kernel `src/analysis/convolution.ts` implements (a) and was measured in Node 24 on an AMD Ryzen 5 3600 (12 threads, 17 GB, Windows 11), median of 9-15 runs after 3 warm-ups, with an inline FFT prototype for comparison only (no dependency added). Browser and phone measurements, which the performance plan's protocol asks for, were not taken.

| step \(h\) | \(n=30\) cumulative (\(n-1\) convolutions) | last step only | shape edit to \(n=30\) | plus standardize, Kolmogorov, moments | FFT, \(B^{30}\) |
| --- | --- | --- | --- | --- | --- |
| 0.01 (101 nodes, 2901 at \(n=30\)) | 5.4 ms | 0.33 ms | 7.0 ms | 7.6 ms | 0.8 ms |
| 0.005 (201 nodes, 5801 at \(n=30\)) | 18.3 ms | 1.2 ms | 18.6 ms | 21.2 ms | 1.6 ms |

At \(h=0.01\) the cumulative cost grows from 0.04 ms (\(n=1\)) through 1.2 ms (\(n=10\)) to 5.4 ms (\(n=30\)); the Next step button costs one convolution (at most 0.33 ms). The cost scales as \(n^2/h^2\): halving \(h\) multiplied the \(n=30\) time by about 3.4.

## Decision

Use (a): sampled densities on the uniform grid \(h=1/100\) on \([0,1]\), trapezoid weights over the overlap of the supports, renormalized after every step with the signed mass residual reported, direct \(O(m^2)\) convolution, \(n\le30\). Fix \(h=0.01\); do not offer a finer grid.

- A full recompute after a base-shape edit at \(n=30\) costs about 7.6 ms with the readouts on this desktop, inside one 16 ms frame with margin about 2. The shape drag can recompute per pointer event at \(h=0.01\), or coalesce to one recompute per animation frame as a cheap safeguard.
- The stepper and Play need one convolution per step (0.33 ms), so playback is never the bottleneck.
- Accuracy needs nothing finer: the standardized-sum distance against the exact Irwin-Hall law is within \(10^{-4}\) at \(h=0.01\), and the skewed density's \(n=10\) distance stays 0.01248 to five digits when \(h\) is halved or quartered (see the evidence file).

Open until a browser or phone check: the performance plan records phone lag on earlier scenes, so a factor 2-4 would put \(n=30\) near or over 16 ms on a phone. If that happens, the escape routes in order are: recompute on drag with a throttle (or at the displayed \(n\) only, which is cheaper than \(n=30\)), then (b) for the shape-edit path.

## Alternatives

- **(b) FFT convolution.** Measured 0.8 ms (\(h=0.01\)) and 1.6 ms (\(h=0.005\)) for \(B^{30}\) in one forward and one inverse transform of 4096 or 8192 points. It is 7-12 times faster at \(n=30\) but needs a power-of-two padding, careful scaling and trapezoid end handling, and its roundoff can leave tiny negative values near the support edges that would need clipping before the Kolmogorov scan (not examined). The prototype was timed only; its numbers were not compared with the direct result and no FFT code is in the repository. Worth it only if the phone check fails or a finer grid is wanted.
- **(c) Exact piecewise-polynomial convolution.** Exact for piecewise-linear inputs and removes the \(O(h)\) kink error, but the number of pieces and the polynomial degree grow with \(n\) (degree \(n\) after \(n\) summands of linear pieces), coefficients become ill-conditioned, and the code is the heaviest of the three. The spec's accuracy targets do not need it.

## Consequences

- The kernel is pure and free of React and JSXGraph; the Demonstration model owns the shape heights and calls `nFold`, `standardize`, `moments`, `cdf` and `kolmogorovDistance`; invalid input returns a status (`n-out-of-range`, `zero-mass`, `invalid-heights`, ...) instead of throwing.
- Grid error is \(O(h)\) at density kinks and jumps and \(O(h^2)\) elsewhere; each step loses a little mass (about \(h^2\) for the right triangle, round-off for the uniform density), which the kernel restores and reports. The displayed distance is a statement about the stated density, \(n\) and \(h\) only, never a rate.
- The kernel uses the trapezoid rule over the overlap of the supports (half weight at both ends). An exact rational piecewise-polynomial oracle (review, [evidence](../reviews/probability-statistics/ps-1b-kernel.md)) confirmed the kernel to about \(4\cdot10^{-5}\) and showed the spec's draft numbers came from a less exact scheme (density error \(5\cdot10^{-3}\) at \(n=2\), mass 0.999975, skewed distances 0.02495, 0.01859, 0.01261). The spec was amended to the exact values.
- The browser and phone drag measurement the performance plan asks for is taken in the P3 graph slice (F2a). If a phone misses the frame, coalesce recomputes per animation frame first, then reconsider (b).
- The 16 ms budget rests on one desktop in Node, not on a browser or phone; the performance plan's drag-gesture measurement is still to be done with the real board.
