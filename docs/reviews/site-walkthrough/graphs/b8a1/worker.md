# B8a first half: analysis text sweep (worker)

Captured 9 of 12 ids. Patterns and textKept (scripts/demonstration-preview-recipes.cjs captureText):
- bisection keep `^f\(x\) = ` -> ["f(x) = x² − 2"], webm 55693 B
- root-finding same, hide only -> ["f(x) = x² − 2"], 50896 B
- mean-value same -> ["f(x) = x²"], 118226 B
- quadrature [] 131315 B; darboux [] 79339 B; taylor [] 59879 B; uniform-convergence [] 76984 B; fourier-series [] 104213 B; fourier-coefficients [] 219126 B
Kept strings language-neutral; no pattern adjusted. Manifest changed only for these 9 ids (captures, motions) plus selectiveRecapture, graphSourceRevision, presentationFingerprint.

Check edits: none. No check requires board text visible: textContent readers (motion.cjs:985, row driver 221-237) survive hiding; _driver.cjs:35-39 textRects skips hidden nodes.

Left out (not text-related, scripts untouched):
- sequence: applyAction asserts the epsilon field reads 0.3 after fill and gets 0.1 (recipe actions, recipes.cjs:378), in poster or clip phase, 4 of 4 runs. A standalone browser replay of the same actions passed; cause not found.
- euler-method: row control "Začetni y₀" no longer exists in the app (row label stale since 79eaa68d), _driver.cjs:292.
- accumulation: checkStep concept-motion.cjs:73 compares the "Točka x" input (now the Slider range input) to the board x within 5e-5 and fails; stale harness versus the Slider migration.
Their table entries were removed; none of them is in the test id list.

Posters (after):
- bisection: "f(x) = x² − 2" bottom right, no Slovenian, off subject (clear of curve); bracket, midpoint intact.
- root-finding: same label; the Newton-step markers crowd near x=1.5 (not text related).
- quadrature: none; fine.
- mean-value: "f(x) = x²" overlaps the axis numbers 2 and 2,5 (R7 issue, on the x axis subject); handler decision.
- darboux, taylor, uniform-convergence, fourier-series, fourier-coefficients: no text left, none missing meaning visibly; in taylor the red marker on the axis and in uniform-convergence the X marker are unlabelled.

Checks: just tooling-test passed (177.7 s, warnings in log); just lint passed. Page: build/walkthrough-graphs/b8a1.html, page and sample images return 200.
Not verified: smoke test, dropped ids' clips.
Dirty: scripts/demonstration-preview-recipes.cjs, demonstration-preview-text.test.cjs, manifest.json, 9 posters and clips in src/images/demonstrations/catalog/.
