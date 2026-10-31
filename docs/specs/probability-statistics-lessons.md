# Probability and statistics on the graph (Verjetnost in statistika na grafu)

**Status:** proposed, 2026-10-31. Specification only; implementation not scheduled.
**Agreed:** 2026-10-31 (owner approved the family; details below are proposals for owner review).
**Source:** [expansion research note, candidate E4](../research/lesson-family-candidates-2026-10-31-expansion.md) (anchors, pitfalls, sample \(B(20,\tfrac12)\)). Anchors read in text extracted from the matura catalogue M-MAT-2026: §4.16 (*normalna porazdelitev* is OR; *zaporedje neodvisnih poskusov* is VR) and §4.17 (scatter plot, box plot, mean, median, standard deviation, interquartile range, "ocenjuje preproste povezave med statističnimi spremenljivkami"), and in the FMF 2025 pages *Verjetnost* (c153: density, normal distribution, convergence in distribution, Poisson approximation) and *Statistika* (c146: central limit theorem, linear regression models). Textbooks named in those syllabi (Grimmett–Welsh, Pitman, Rice) are cited, not opened; Berry–Esseen is cited from the literature, not opened. Part of the [new lesson families](new-lesson-families.md) index.

## Problem Statement

Bezeg has no probability or statistics. Yet the normal distribution is an OR matura topic, the matura asks students to read box plots and scatter plots and to judge simple relations between variables, and two FMF courses build on densities, the central limit theorem (CLT) and regression. These are concepts a graph explains well: a probability is an area under a curve, a bar chart of a binomial law turns into the bell curve, repeated convolution flattens every shape into the same bell, a mean follows an outlier while a median does not, and a correlation coefficient can be zero for a perfect curve. Students meet them mostly as formulas and as the tables of a calculator. This family shows them on the same drag-and-read graph as the rest of Bezeg, with exact computation instead of simulation so every lesson is reproducible.

## Solution

Add a Learn chapter **Verjetnost in statistika na grafu / Distributions, CLT and correlation** with five chapter-owned guided activities, each backed by a catalog Demonstration that stays available for free exploration ([chapter-owned guided learning](chapter-owned-guided-learning.md)). Audience: upper secondary (P1, P4, P5 basics) and university (P2 continuity correction and Poisson regime, P3, regression reading). Prose states hypotheses and the sense of each convergence; pictures show instances and are labelled illustrations, never proofs. Each lesson is 5-7 steps, predicts before it reveals, and ends in free exploration. No exercises, grading or progress tracking. There is no randomness anywhere: densities and laws are computed exactly or by deterministic numerical convolution, so a Preset always reproduces its picture. (If a sampling toggle is ever added, it needs a fixed seed; it is out of scope here.)

### Release batches

| Batch | Lessons | Release condition |
| --- | --- | --- |
| A | P1 Density and area; P2 Binomial to normal | New `distributions.ts` kernel passes the tests below; existing graphs, routes and Presets unchanged |
| B | P3 CLT without randomness; P4 Mean, median, standard deviation | Batch A released; the convolution kernel and its error measurements are reviewed for P3; P4 uses one-dimensional dots on an axis, so it does not need the point-canvas ADR of I4 |
| C | P5 Correlation | Batch B released **and** [interpolation I4](interpolation-approximation-lessons.md) (Least squares, Batch B of that family) released, because the regression line reuses its kernel |

### Reuse and new modules

Verified to exist in this worktree:

- `src/analysis/riemann.ts`: `Subinterval` (`x0, x1, y0, y1`, lines 44-51), `subintervalPolygons` (splits a strip at a sign change and tags polygons above or below the axis) and the `FillPolygon` type. These do not depend on the function catalogue and can be reused to fill the area under a density from trapezoid strips built by the new kernel. `fillData`, `subintervals`, `riemannSum` and `exactIntegral` take a `CatalogFunction`, and `exactIntegral` needs a closed-form antiderivative. They cannot be reused as they are: the normal density has no elementary antiderivative, and the catalogue is a closed list (`FUNCTION_IDS = ['square','sin','exp']`, `src/analysis/functions.ts:7`; ADR 0007). Do not add densities to `FUNCTION_IDS`; that would change a type that stored Presets and released lessons use.
- `src/graphs/functions/DefiniteIntegralGraph.tsx` is the drawing model: the area as exactly two filled JSXGraph curves (above and below the axis) whose point lists are rebuilt in `updateDataArray` (lines 147-154), so the object count does not depend on the number of strips. It also drags bounds along the axis with rounding to 0.01, which P1 imitates for the interval ends.
- `src/graphs/functions/BaseFunctionGraph.tsx` (line 138): the abstract base with `defaultModel`, `presetCollection`, `createScene`, `renderControls`, `renderReadout`, `commitModel`, owned generated objects and lesson actions. Each new Demonstration extends it with its own model. It is shaped for a function \(y=f(x)\) with a view per example (`exampleView`), which fits P1-P3; P4 and P5 draw data points, which is the point-canvas question below.
- `src/analysis/format.ts`: `formatNumber`, `formatSignificant`, `formatLineEquation` with Slovenian decimal commas, for all readouts.
- Registration as for Analysis and the other new families: `src/learning/content/familyChapters.ts`, ADR 0011, ADR 0016; ADR 0014 (chapters share Demonstrations).
- **Least squares (dependency).** The regression line in P5 must call the kernel `src/analysis/leastSquares.ts` that [interpolation-approximation-lessons.md](interpolation-approximation-lessons.md) lesson I4 defines (suggested name there; not yet implemented), degree 1, and reuse its rejection rules (all-equal \(x\) rejected, fewer than 2 points disabled). This family must not add a second solver. P5 adds only the closed-form summary (\(r\), \(r^2\), the slope identity \(b=r\,s_y/s_x\)) and uses I4's result as the cross-check in the tests. If I4 is rescheduled, P5 waits.

No `erf`, gamma, binomial or density code exists (search of `src/` found no `erf`, `binomial`, `normal`, `convolution`). Suggested new pure modules, free of React, JSXGraph and localization:

- `src/analysis/distributions.ts` (**the density and convolution kernel this spec owns**): standard normal density and CDF via an accurate `erf`; normal quantiles are not needed; binomial and Poisson mass functions; continuity-corrected and plain normal approximations; trapezoid strips of a density for the area drawing.
- `src/analysis/convolution.ts`: `GridDensity` (`x0`, step `h`, values), `normalize`, `convolve`, `standardize`, `cdf`, `moments`, `kolmogorovDistance` against the normal, base densities (uniform, right triangle, a user-shaped piecewise-linear density).
- `src/analysis/descriptiveStatistics.ts`: mean, median, quartiles (one stated convention), standard deviation (population and sample), fences, five-number summary on integer-tenth inputs.
- `src/analysis/correlation.ts`: exact integer sums, \(r\), \(r^2\), slope identity; calls `leastSquares.ts` for the line.
- Demonstrations (suggested): `DensityAreaGraph`, `BinomialNormalGraph`, `ConvolutionGraph`, `SummaryStatisticsGraph`, `CorrelationGraph`, each with a model/parse file following `riemannModel.ts`.

Sibling families: `fourier-series-lessons.md` (E6) needs numerical integration of periodic functions but not densities; `linear-maps-lessons.md` (E1) is unrelated to this kernel. No dependency on them. [Interpolation I4](interpolation-approximation-lessons.md) is the only hard dependency.

### Decisions needing an ADR

1. **Where the density/convolution kernel and Presets live.** (a) A new "Probability" Demonstration family with its own Preset collections; (b) join the Analysis family. (a) keeps the closed function catalogue untouched and gives the chapter its own registration; (b) risks stretching `FunctionId` and the Analysis Preset types. Decide before Batch A.
2. **Convolution representation** (Batch B). (a) Sampled density on a uniform grid with trapezoid weights, direct \(O(m^2)\) convolution; (b) FFT convolution; (c) exact piecewise-polynomial convolution for piecewise-linear inputs. (a) is simple and needs no dependency; measured below with step \(h=0.01\): the standardized-sum CDF error against the exact Irwin-Hall law stays under \(10^{-4}\) (checked). (c) is exact but heavier to write. Choose with the measurement of the largest allowed \(n\) and grid per the [performance plan](../performance-plan.md).
3. **Data-point editing model for P4 and P5.** P4 uses dots on one axis; P5 needs points in the plane. Reuse the "points on a canvas" decision that I4 must already take (free draggable points plus a typed list, or a fixed number with numeric entry); do not take a second decision. Decide with I4.
4. **Quartile and standard-deviation conventions** (Batch B). See P4 and Correctness Notes; the choice changes numbers a student can compare with a calculator or a textbook. Needs a short source check of the Slovenian matura convention before fixing (not verified here).

## Concept contracts and acceptance criteria

All numbers were computed by the spec author in Python (stdlib, `math.erf`, `math.comb`, exact `Fraction`), marked **checked**; scripts are not committed. Examples are implementation defaults; equivalents may replace them if the learning goal, edge cases and independent checks are kept.

### P1. Density and probability as area (Gostota in verjetnost kot ploščina)

- Learning goal: for a continuous variable a probability is the area under the density between two bounds; the total area is 1; the shape depends on \(\mu\) (position) and \(\sigma\) (width), but the share of area within \(k\) standard deviations of \(\mu\) does not.
- Prerequisites: the definite integral chapter (area, [DefiniteIntegralGraph](../../src/graphs/functions/DefiniteIntegralGraph.tsx)); no probability beyond "relative frequency".
- Default example: \(X\sim N(0,1)\), then \(N(100,15)\). \(P(\mu-k\sigma\le X\le\mu+k\sigma)=0.68269,\ 0.95450,\ 0.99730\) for \(k=1,2,3\) **checked**. For \(N(100,15)\): \(P(85\le X\le130)=\Phi(2)-\Phi(-1)=0.97725-0.15866=0.81859\) **checked**; a Simpson quadrature of the density with 2000 panels gives 0.81859461412, equal to the erf value to \(10^{-13}\) **checked**.
- Steps: (1) the bell curve and the total area 1; predict how much lies within one \(\sigma\); (2) drag the interval ends \(a,b\) and read the area as a percentage; (3) set \(a=\mu-\sigma,\ b=\mu+\sigma\) and reveal 68 %; (4) change \(\mu,\sigma\) with sliders: the curve moves and flattens, the area between \(\mu\pm\sigma\) does not change; (5) switch to \(N(100,15)\) and read \(P(85\le X\le130)\); (6) free exploration (one-sided probabilities, the tails).
- Graph needs: density curve with filled area between draggable \(a,b\) (rounded to 0.01 as `DefiniteIntegralGraph` does); \(\mu\) and \(\sigma\) controls (\(\sigma>0\), documented range, suggest 0.1-20); readout of the probability and of the standardized bounds \(z_a,z_b\); a view that rescales with the parameters (a fixed example view per default plus fit-to-curve); text status for \(a>b\) (swap or empty) and for a very thin interval.
- Acceptance:
  1. The values above reproduce to the displayed digits; the probability equals \(\Phi(z_b)-\Phi(z_a)\) from the kernel, and the kernel's `erf` agrees with an independent implementation to \(10^{-12}\) over \([-6,6]\) (the author's series-plus-continued-fraction version differed from `math.erf` by \(2.7\cdot10^{-14}\) at most on that range, **checked**; the tolerance is a tolerance, not exactness, and is stated in the code docs).
  2. Total area (a very wide interval) reads 1 within the displayed digits; the tails use the complementary function so \(P(Z>6)\) is not rounded to 0 by cancellation.
  3. \(\sigma\le0\) or non-finite input is rejected with a message; \(a=b\) gives probability 0 and no drawing error.
  4. The prose says "area under the density", not "probability of the point \(a\)": a single value has probability 0 for a continuous variable.
  5. The 68-95-99.7 numbers are labelled as properties of the normal law (theorem with source: standard), the drag as an illustration.
  6. Reset, restore, Preset round trip, both languages.

### P2. From binomial to normal (Od binomske k normalni porazdelitvi)

- Learning goal: the bars of \(B(n,p)\) approach the normal curve with the same mean and variance as \(n\) grows (de Moivre-Laplace, a special case of the CLT), the approximation of \(P(X\le k)\) needs the continuity correction \(k+\tfrac12\), and for small \(p\) the better limit is Poisson with \(\lambda=np\).
- Prerequisites: P1; binomial law and "independent trials" (matura §4.16, VR).
- Default example: \(X\sim B(20,\tfrac12)\), mean 10, \(\sigma=\sqrt5\). \(P(X\le8)=0.25172\) exactly (\(\sum_{k\le8}\binom{20}{k}/2^{20}\)); normal with correction \(\Phi\!\big(\tfrac{8.5-10}{\sqrt5}\big)=0.25117\); without \(\Phi\!\big(\tfrac{8-10}{\sqrt5}\big)=0.18555\) **checked** (matches the research note). Second case \(B(100,\tfrac12)\), \(P(X\le45)\): exact 0.18410, corrected 0.18406, uncorrected 0.15866 **checked**. Poisson regime \(B(100,0.02)\), \(\lambda=2\): \(P(X=2)\) binomial 0.27341, Poisson 0.27067, normal with correction 0.27902 **checked**; total variation distance between \(B(100,0.02)\) and Poisson(2) is 0.00457 **checked**, below the Le Cam bound \(np^2=0.04\) (cited, not opened).
- Steps: (1) bars of \(B(20,\tfrac12)\) with the normal curve over them; predict \(P(X\le8)\); (2) shade the bars up to 8, read the exact sum; (3) the normal area up to 8 gives 0.18555, up to 8.5 gives 0.25117: why the bar of 8 spans \([7.5,8.5]\); (4) increase \(n\) (20, 50, 100): the corrected error shrinks; (5) set \(p=0.02\), \(n=100\): the normal curve is skewed off, the Poisson bars fit; (6) free exploration.
- Graph needs: \(n\) (documented maximum, suggest 200), \(p\) sliders (or numeric entry); bars as one JSXGraph curve per sign convention (object count independent of \(n\)); overlay of the normal curve; optional Poisson bars; the threshold \(k\) as a draggable integer; readout of exact, corrected and uncorrected values and the absolute errors; a toggle "continuity correction" that is on by default.
- Acceptance:
  1. Defaults above reproduced to 5 decimals; the exact value uses summed mass-function terms (log-sum or recurrence; the author's log-sum version sums to 1 within \(2\cdot10^{-13}\) for \(B(200,0.3)\), **checked**), never a table lookup.
  2. \(p\in(0,1)\) open, \(n\ge1\) integer; \(p\) at 0 or 1 is rejected with a message (variance zero) or handled as a point mass with a status, one choice documented.
  3. The prose says the normal approximation is a limit statement, that the correction is not optional at classroom \(n\) (0.25117 versus 0.18555 against 0.25172), and that the Poisson regime is \(n\) large with \(np\) moderate; "rule of thumb" thresholds are labelled rules of thumb.
  4. Displayed errors state they are for this \(n,p,k\) only; the picture does not give a rate.
  5. Reset, restore, Preset round trip, both languages.

### P3. The central limit theorem without randomness (Centralni limitni izrek brez naključja)

- Learning goal: the density of the sum of \(n\) independent copies is the \(n\)-fold convolution; after standardizing (subtract \(n\mu\), divide by \(\sigma\sqrt n\)) it approaches the standard normal density for almost any starting density with finite variance. Convergence is in distribution, not pointwise in every sense.
- Prerequisites: P1, the integral chapter; "independent sum" at the level of "add one more copy".
- Default example: \(X\sim U(0,1)\) (mean \(\tfrac12\), variance \(\tfrac1{12}\)) and a skewed right-triangle density \(f(x)=2(1-x)\) on \([0,1]\) (mean \(\tfrac13\), variance \(\tfrac1{18}\), skewness \(0.56569\)). For \(U(0,1)\), the Kolmogorov distance \(\sup_x|F_n(x)-\Phi|\) of the standardized sum from the standard normal is 0.05721, 0.01643, 0.00985, 0.00571, 0.00281, 0.00139 for \(n=1,2,3,5,10,20\) **checked** against the exact Irwin-Hall CDF. For the skewed density (grid computation, \(h=0.01\)) it is 0.07865, 0.03556, 0.02495, 0.01859, 0.01261 for \(n=1,2,3,5,10\) **checked**; the grid value at \(n=10\) moved from 0.01261 to 0.01252 when \(h\) halved (\(h=0.005\)), so the third digit is a tolerance **checked**. Skewness of the standardized sum falls as \(0.56569/\sqrt n\) (0.4000, 0.3266, 0.2530, 0.1789 for \(n=2,3,5,10\)) **checked**.
- Steps: (1) the base density and the normal curve with the same mean and variance; (2) convolve once (\(n=2\)): the sum of two uniforms is a triangle; (3) keep adding (\(n=3,5,10\)): the standardized density approaches the bell; (4) switch to the skewed density: it needs more terms and stays visibly lopsided at \(n=3\); (5) drag the base density's shape (piecewise-linear heights) and see the same outcome; (6) read the distance readout and the prose on what it does and does not say; (7) free exploration.
- Graph needs: the base density as a piecewise-linear shape with a small number of draggable heights (suggest 5 on \([0,1]\), normalized automatically), presets uniform and skewed; \(n\) stepper 1-30 (Next step, Play/Pause, Reset via `IterativeFunctionGraph`, ADR 0012/0013, adding an id to `LESSON_ANIMATION_IDS` in `src/learning/model.ts`, currently six ids); the standardized convolution curve over the standard normal curve; optional CDF view; readouts of mean, variance and the Kolmogorov distance; a status when the base density is not integrable to a positive mass.
- Acceptance:
  1. The convolution kernel reproduces the Irwin-Hall density and CDF: with \(h=0.01\) the sup density error is \(5\cdot10^{-3}\) at \(n=2\) (the kink of the triangle; order \(h\)) and \(\le6\cdot10^{-5}\) for \(n\ge3\), and the CDF error is below \(10^{-4}\) for \(n=1,2,3,5,10\) **checked** (differences of the grid and exact Kolmogorov distance were about \(4\cdot10^{-5}\) at most: grid 0.00285 against exact 0.00281 at \(n=10\)). Tests use these values as tolerances, not as exact equalities.
  2. Each step conserves mass: after the trapezoid convolution the mass of the grid density is 0.999975 at \(h=0.01\) **checked**, so the kernel renormalizes and reports the residual; means and variances of the \(n\)-fold law equal \(n\mu\) and \(n\sigma^2\) within \(10^{-3}\) (skewed density at \(n=10\): mean 3.33287 against 3.33333, variance 0.55612 against 0.55556 **checked**).
  3. The exact point value \(f_2(1)=\tfrac23\) of the skewed density's two-fold convolution is matched by the grid (0.6666 versus 0.66667, **checked**).
  4. The prose names the theorem, its hypotheses (independent, identically distributed, finite variance) and its source (FMF *Verjetnost*, *Statistika*; Berry-Esseen for a rate, cited, not opened), says convergence is in distribution, and says one visual match at one \(n\) is not a rate. The measured distances are shown as an illustration: for the symmetric uniform density \(n\cdot K_n\) is about 0.028 (0.057, 0.033, 0.030, 0.029, 0.028, **checked**), for the skewed density \(\sqrt n\cdot K_n\) is about 0.04 (0.079, 0.050, 0.043, 0.042, 0.040, **checked**); the lesson does not claim these constants, only that skew slows the approach.
  5. The base density is clamped to nonnegative heights; an all-zero shape is rejected; \(n\) above the maximum is rejected.
  6. Editing the base shape invalidates history and pauses playback; a reopened Preset is paused with the stored \(n\); both languages.

### P4. Mean, median, standard deviation and the box plot (Srednja vrednost, mediana, standardni odklon)

- Learning goal: the mean reacts to every value and to outliers, the median does not; the standard deviation measures spread about the mean; the box plot shows the five-number summary and flags points beyond the fences.
- Prerequisites: none beyond arithmetic; matura §4.17 vocabulary.
- Default example: data \(\{4,5,5,6,6,7,8\}\): mean \(5.857143\), median 6, population standard deviation \(1.2454\) (sample \(1.3452\)), quartiles 5, 6, 7 by the median-of-halves rule (odd \(n\): the median is excluded from both halves), IQR 2, fences \(2\) and \(10\) **checked**. Move 8 to 30: mean 9.0, median 6, population standard deviation \(8.6189\) (sample \(9.3095\)); quartiles unchanged, 30 lies beyond the upper fence 10 **checked**. The same data under a linear-interpolation quartile rule give \(Q_1=5,\ Q_3=6.5\), IQR 1.5: a different box from the same numbers **checked**. The mean minimizes \(\sum(x_i-c)^2\) (10.857 at the mean against 11 at the median) and the median minimizes \(\sum|x_i-c|\) (7 at the median against 7.143 at the mean) **checked**. An even-sized sample \(\{2,3,5,9\}\) has median 4 (mean of the middle two) **checked**.
- Steps: (1) dots on an axis with the mean and median markers; predict what happens to each if the largest value moves right; (2) drag it: the mean follows, the median stays; (3) the box plot and its fences; the far dot becomes a flagged outlier; (4) the spread: show \(\sigma\) as a band around the mean, add a dot far from the mean; (5) the convention panel: two quartile rules, one dataset; (6) free exploration (add and remove dots).
- Graph needs: 3-15 draggable dots on a number line (documented bounds, snapped to 0.1 so ties and equal values are well defined); mean and median markers; box plot with whiskers to the extreme non-flagged values and flagged outliers; readouts with the convention named; a toggle population/sample \(\sigma\); keyboard-operable dots (arrow keys) and a typed list as in the I4 editing decision.
- Acceptance:
  1. All values above reproduced; the five-number summary and the outlier test are computed on **integer tenths** (data snapped to 0.1), so equality, ordering and the fence comparison \(x>Q_3+1.5\,\mathrm{IQR}\) (compared in doubled units to avoid half tenths) are exact; the mean and standard deviation are floating point and shown to the stated digits.
  2. Median and quartiles are invariant under reordering and under changing a value without crossing its rank (property test); the mean is not.
  3. Fewer than 3 dots disables the box plot with a message; the standard deviation of one dot is 0 and the sample version is undefined (shown as a dash), not an error.
  4. The prose states which quartile convention and which \(\sigma\) the lesson uses and that calculators and software differ (the two rules above, **checked**), and that "outlier" here means beyond the 1.5 IQR fences, a convention, not a mathematical property.
  5. Reset, restore, Preset round trip, both languages.

### P5. Correlation and the regression line (Korelacija)

- Learning goal: \(r\) measures **linear** association; it is \(\pm1\) only for points on a line, it can be 0 for a perfect curve, it is moved by one outlier, and correlation does not show cause. The least-squares line comes from [interpolation I4](interpolation-approximation-lessons.md).
- Prerequisites: P4 vocabulary; I4 (least squares, residuals); linear function chapter.
- Default example: points \((0,1),(1,2),(2,2),(3,4)\), the data of I4. \(S_{xx}=5,\ S_{yy}=4.75,\ S_{xy}=4.5\); \(r^2=\tfrac{81}{95}=0.852632\), \(r=0.92338\) (exact integer form: \(nS_{xy}=18=4\sum xy-\sum x\sum y\)); the line is \(y=0.9x+0.9\), sum of squared residuals 0.7, equal to \(S_{yy}(1-r^2)\) and equal to I4's default **checked**. The slope identity \(b=r\,s_y/s_x\) gives 0.9 **checked**. The regression of \(x\) on \(y\) is \(x=0.94737y-0.63158\); the product of the two slopes is \(r^2\) **checked**, so the two lines differ unless \(r=\pm1\). Replacing \((3,4)\) by \((3,8)\): \(r=0.84680\), line \(y=2.1x+0.1\), sum of squares 8.7 (I4's sensitivity case) **checked**. Nonlinear: \(y=x^2\) at \(x=-3,\dots,3\): \(S_{xy}=0\) exactly, so \(r=0\) although \(y\) is a function of \(x\) **checked**; the same points at \(x=0,\dots,3\) have \(r=0.95831\) **checked**; a ring of eight points \((\pm3,0),(0,\pm3),(\pm2,\pm2)\) also has \(S_{xy}=0\) **checked**. Optional Anscombe quartet (four data sets with \(r\approx0.816\) and line \(y\approx3.0+0.5x\)): values recomputed from the published data as recalled by the author, giving \(r=0.8164,0.8162,0.8163,0.8165\), slope 0.500, intercept 3.000-3.002 **checked** against the published summary; the original paper was not opened, so the data are "cited, not opened" and must be verified against the source before shipping.
- Steps: (1) scatter plot of the default points; predict the sign and size of \(r\); (2) reveal \(r\) and the regression line from I4; the residuals; (3) drag one point far away: \(r\) and the line move; (4) load the parabola: \(r=0\) with a perfect curve; (5) show the line of \(x\) on \(y\) and why the two lines differ; (6) free exploration (optional Anscombe set).
- Graph needs: draggable points (3-20, snapped to 0.1) with the editing model of I4; the regression line from `leastSquares.ts` (degree 1) with residual segments; readouts \(r\), \(r^2\), slope, intercept; an option to show the line of \(x\) on \(y\); fixed example sets (default, parabola, ring, outlier case); a status for zero variance in \(x\) or \(y\), where \(r\) is undefined.
- Acceptance:
  1. Defaults above reproduced; \(r\) is computed from integer sums of the snapped data (\(nS_{xy},nS_{xx},nS_{yy}\) are integers in tenths-squared units), so \(S_{xy}=0\) is detected exactly and \(r=0\) is shown as exactly 0 for the parabola and ring examples; \(r\) itself is floating point.
  2. The regression line equals the I4 kernel's degree-1 fit to \(10^{-12}\) on the default and the parabola (slope 0, intercept 4), and the residuals are orthogonal to the design columns (the I4 criterion); \(r\) is checked against \(\pm\sqrt{1-\mathrm{SSres}/S_{yy}}\) with the sign of \(S_{xy}\).
  3. All-equal \(x\) or all-equal \(y\) gives \(r\) undefined with a message (no division by zero); fewer than 3 points disables \(r\) (two points always give \(\pm1\) and say nothing).
  4. The prose says \(r\) is a measure of linear association only, that \(r=0\) does not imply independence, that a large \(|r|\) does not imply causation, that one outlier can change it (0.92338 to 0.84680), and that squared vertical residuals are a modelling choice (I4). The matura formulation "preproste povezave" is met by the scatter plot and reading the slope's sign; \(r\) itself is a university-level extension in this family.
  5. Reset, restore, Preset round trip, both languages.

## User Stories

1. As a student, I drag two bounds under a bell curve and read the probability as an area.
2. As a student, I see the bars of a binomial law turn into a bell and learn why the half-unit correction matters.
3. As an educator, I add one more convolution on a projected graph and the class sees any shape become a bell without a random number generator.
4. As a student, I drag the largest value and see the mean move while the median stays.
5. As a student, I see a perfect parabola with correlation zero and stop treating \(r\) as "strength of any relation".
6. As an educator, I open a saved scene with the same data and the same numbers every time.
7. As a reader on a phone, I use steppers and typed values instead of dragging.

## Terms (proposals, to be settled by localization.md#choosing-new-terms)

| English | Slovenian proposal | Basis to check |
| --- | --- | --- |
| normal distribution | normalna porazdelitev | matura catalogue §4.16 and FMF c153 wording |
| density (of a distribution) | gostota (porazdelitve) | FMF c153 "pojem gostote porazdelitve" |
| binomial / Poisson distribution | binomska / Poissonova porazdelitev | to research in school texts |
| central limit theorem | centralni limitni izrek | FMF c146 |
| convergence in distribution | konvergenca po porazdelitvi | FMF c153 |
| convolution | konvolucija (vsota neodvisnih spremenljivk) | to research; check existing analysis strings first |
| standardized sum | standardizirana vsota | to research |
| continuity correction | popravek za zveznost | to research; no source read |
| mean / median / standard deviation | aritmetična sredina, mediana, standardni odklon | matura §4.17 |
| interquartile range | medčetrtinski razmik | matura §4.17 |
| box plot | škatla z brki | matura §4.17 |
| scatter plot | razsevni diagram | matura §4.17 |
| correlation coefficient | korelacijski koeficient | FMF c146 treats regression; term to research |
| regression line | regresijska premica | to research; reuse I4's term for least squares |
| outlier | osamelec | to research |

Final wording, sources and the table entry are recorded in the implementing change.

## Implementation Decisions

- Mathematics lives in pure typed modules; fits, densities and laws are derived from validated fields, never from stored arrays. The density/convolution kernel in `distributions.ts` and `convolution.ts` is owned by this family; no other family depends on it as of this writing.
- Closed example sets and fixed parameter ranges; no free-text formula input (ADR 0007). The base density in P3 is a bounded list of heights, not a parsed function.
- No `Math.random` anywhere; a test asserts that two builds of the same Preset give identical arrays.
- Numbers are shown through `format.ts` with Slovenian decimal commas; any probability below display precision is shown as a "less than" bound, not as 0.
- Iteration in P3 uses `IterativeFunctionGraph` and one typed scene action (ADR 0013 pattern); other lessons use plain `BaseFunctionGraph` models. Playback is stopped by default.
- Existing routes and stored Presets are unchanged; new routes and Presets are additive (state in the implementing change). Hosting stays separate from the mathematics.

## Testing Decisions

- Kernel tests: `erf`-based \(\Phi\) against independent values (\(\Phi(2)=0.97725\), symmetry, tails); binomial pmf sums to 1; the three \(B(20,\tfrac12)\) values; Poisson comparison; convolution against the Irwin-Hall density and CDF with the stated tolerances; mass conservation and moments; the grid-halving check (tolerance) as a regression test; descriptive statistics on the examples including both quartile conventions and an even-sized sample; exact integer \(S_{xy}\), \(r\) and \(r=0\) cases; dependency test that the regression line equals the I4 kernel.
- Scene tests: apply multi-action scenes in one synchronous tick (several `next-step` actions, bound drags, point edits) and check state; editing clears history; malformed values rejected.
- Preset tests: save/reopen, export/import, out-of-domain data (\(\sigma\le0\), \(p\) outside \((0,1)\), negative heights, too many points).
- Lesson/content tests: step counts, languages in lockstep, `lessonMathNotation.test.ts` unchanged and passing (undelimited formula fields, `{,}` decimals in Slovenian), `tsc --noEmit` after localization changes.
- Browser: a smoke row per lesson (default scene, controls, reveal, restore, catalog link, refresh, narrow viewport, keyboard, touch alternatives); the full checklist only if the shared catalogue or lesson runtime changes.
- Performance: measure \(n\)-fold convolution at the largest \(n\) and grid size, binomial bars at \(n=200\), and dragging the interval ends in P1 against [the performance plan](../performance-plan.md) before choosing a drawing approach. The 3000-sample grid of \(n=30\) at \(h=0.01\) is a candidate threshold, not a measured one.

### Batch-wide acceptance gate

1. Each Demonstration opens directly and after refresh, with its chapter-owned guided activity and a static preview.
2. The concept contract above is met with checked examples and honest guarantees (instances, tolerances and conventions named).
3. Both languages, accessible inputs, projection readability, restore on exit, stopped-by-default playback, Presets and figure export pass.
4. Existing routes, Presets and chapters behave as before.
5. TypeScript, unit and content tests, production build, smoke checks and mathematics review pass; commit and push follow the repository workflow.

## Correctness Notes

- CLT is a theorem (iid, finite variance) about convergence **in distribution**. A visual match at one \(n\) shows no rate and no uniform guarantee; the displayed Kolmogorov distance belongs to that \(n\) and base density. Heavy-tailed laws (no finite variance, for example Cauchy) do not obey it; this is prose only, with no Demonstration.
- Discrete-to-continuous needs the continuity correction (0.25117 corrected, 0.18555 not, exact 0.25172); the lesson must show the correction or state that it is ignored.
- \(r\) measures linear association only; \(r=0\) does not mean independence; \(r\) is not robust to outliers; correlation is not causation. The regression of \(y\) on \(x\) and of \(x\) on \(y\) differ unless \(|r|=1\).
- Convention-dependent numbers (quartiles, population versus sample \(\sigma\), whisker rule) are named on screen; the ADR fixes the defaults. The Slovenian matura convention was not verified.
- Discrete decisions (rank, tie, fence, \(S_{xy}=0\)) run on integer tenths of snapped inputs; probabilities and \(r\) are floating point with stated tolerances, never presented as exact.
- A grid convolution has \(O(h)\) error at density kinks and jumps (visible at \(n=2\) for the uniform law) and loses a little mass per step; the kernel renormalizes and reports it.

## Out of Scope

- Backend, accounts, assessment, grading, progress tracking.
- Random sampling, Monte Carlo, bootstrap, simulated coin tosses (a seeded sampler would be a separate proposal).
- Hypothesis tests, confidence intervals, maximum likelihood, logistic regression, analysis of variance, Gauss-Markov (FMF *Statistika* beyond the CLT and a regression line).
- Multivariate densities, conditional distributions, generating and characteristic functions, laws of large numbers beyond prose.
- Nonlinear or multiple regression, weighted fits and rank correlation (Spearman); least squares itself belongs to [interpolation-approximation-lessons.md](interpolation-approximation-lessons.md).
- Free-text distributions or formulas, renderer replacement, build-tool changes.

## Further Notes

Chapter order follows the batches. The research note ranks this family fourth (high value, medium effort); the only cross-family dependency is I4 for P5, so Batches A and B can ship before interpolation. Not verified: current FMF syllabi beyond the 2025 pages read, the Slovenian matura convention for quartiles and \(\sigma\), the Anscombe data against the original paper, textbook section numbers, Berry-Esseen constants, whether a grid of 3000 points suffices for classroom projection, and the final Slovenian terms. A note on the research file: its candidate text lists the area-drawing reuse as "the Riemann/integral area drawing"; this spec narrows it to `subintervalPolygons` and the two-curve drawing pattern, since `fillData` and `exactIntegral` are tied to the closed function catalogue.
