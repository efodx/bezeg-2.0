# Recipe repoint (task 08, handler 14 worker) - partial

Done: shared puck driver `scripts/puck-control.cjs` (find puck by aria name; range/count fill via typed entry, keyboard stepping, choice, toggle; `revealInTools`, `openTools`, `setPuckValue`). `applyAction` (recipes) and the clip `_driver.cjs` sweep and number-field paths fall back to it. Reveal evidence in `outcome` reads toggle pucks (keys show-accumulation, show-classification, show-certificate, show-supremum).
Rows/recipes repointed: contour-map, lattice-paths, counting-tree, prob-clt, curve-comb, complex-reciprocal, complex-roots, waves, accumulation, extrema, sequence, uniform-convergence; prob-density/prob-binomial-normal text policy now empty keep; clip rows: curve-parametric, curve-comb, curve-offset, curve-curvature, curve-evolute, curve-envelope, conic-focal, geometric-series, convexity, prob-density, prob-binomial-normal, prob-clt, waves, mechanics-descent, curve-kinematics, counting-tree, contour-map, inscribed-angle, simson-line, projective-pole-polar, point-in-polygon, interp-runge (stepper -> number-field "Stopnja n"), hull-robustness quote.
Gate-perf: offset/comb/envelope scripts use the driver for setup.

Unverified / next:
- 22 stored clip records now differ from their rows ("captured from an older row; recapture it"): `_rows.test.cjs` "stored evidence" tests fail until `just clip <id>` recaptures them.
- `_check.cjs` still reads the stale docs route-probe.json (puck labels fail there); needs a re-probe (docs file, outside scripts/).
- Preflight/capture cannot run on the dev server (UntaggedWriteError on the capture's view change); needs a production preview.
- offset-gate-perf: d slider drag on the puck "moved nothing" (puck pointer drag differs); envelope-gate-perf: snapshot assumes one data curve (width 1, 2 points per line, highlight width 3), current board draws 8 five-point curves and a width-4 highlight; count gesture now keys ArrowRight. comb-gate-perf: evolute case threw "JXG undefined" (route not checked).
- Not repointed: lane L34 graphs (polynomial-zeros, rational-function); unconverted graphs the scan flagged (rational, farin, ph-*, derivative, definite-integral, area-between-curves, unit-circle, linear-map, linear-program, function-inverse, complex-euler, recursion-growth, projective-five-point/cross-ratio/three-views): not converted, left as is.
- demonstration-preview-curve-motion.cjs sweeps (Parameter b 1, alpha) still use input locators; those controls are Orodja inputs, tab loop unfolds the card; not run.
