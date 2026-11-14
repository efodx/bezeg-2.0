# B8a second half: function text sweep (worker)

Captured 9 of 11 ids (table entries in scripts/demonstration-preview-recipes.cjs captureText; test list extended). Webm bytes, textKept:
- fixed-point keep `^x1$`: ["x1"], 73918
- function-inverse keep `^f\(x\) = `: ["f(x) = x² (x ≥ 0), f⁻¹(x) = √x"], 198482
- polynomial-zeros keep `^×[2-9]$`, `^p\(x\) = `: ["×2","p(x) = (x + 2)(x − 1)²"], 239450
- rational-function: first kept `^f\(x\) = `, `^[xy] = `; the asymptote names "y = x + 2" and "x = 2" lay on y-axis tick numbers 4 and 8, so changed to Remove: [], 306859
- geometric-series []: 51774; continuity []: 143140
- definite-integral `^f\(x\) = `: ["f(x) = x²"], 56287
- arc-length `^f\(x\) = `: ["f(x) = sin x"], 91096
- extrema: first kept `^[−+]$`, `^f\(−?\d+\) = −?\d+$` (matched −, +, f(−1) = 1, f(2) = 4, f(0) = 0); the value labels lay on tick numbers and axis, so Remove: [], 97464
Manifest changed only for these 9 ids (captures, motions) plus selectiveRecapture, graphSourceRevision, presentationFingerprint. All clips <= 307200.

extrema change: scripts/capture-demonstration-previews.cjs:510 override now `convexity` only; height line (was 518) removed; visibility assertion (was 750) replaced by a comment (749). The collector (selectedConclusions, ~569) stays: convexity and the motion code (motion.cjs:1608) still read it; no assertion on it remains for extrema. Only convexity and extrema passed through those lines. Other extrema assertions untouched.

Check edits: none. No check requires board text visible (readouts are read from the page dd elements; analysis-motion.cjs:60, concept-motion.cjs:34, _driver.cjs:236).

Left out:
- area-between-curves: recipe action field 'Meja b' = 3.2 fails, the control now reads 3.22 (recipes.cjs:386, stale after the Slider migration).
- derivative: with the f(x) text kept, the motion check fails "Last frame PNG differs from the recipe frame" (demonstration-preview-motion.cjs:673, via assertSweepFrame:1210); without the entry it passes, so the kept text differs between first and last frame. Not investigated further.

Posters (after):
- fixed-point: only subscript tag x1 under the marker; no Slovenian; off ticks.
- function-inverse: one formula line bottom right, no Slovenian, clear of ticks and curves.
- polynomial-zeros: ×2 above the double zero, formula bottom right; clear.
- rational-function: no text; fine.
- geometric-series: no text; bars and limit line, fine.
- continuity: no text; jump readable.
- definite-integral: f(x) = x² top right; touches the parabola near its end (minor).
- arc-length: f(x) = sin x top right; clear.
- extrema: no text; clean.
Not fixed: definite-integral label near the curve end.

Checks: see below (just tooling-test, just lint).
Page: build/walkthrough-graphs/b8a2.html, page and sample images return 200. Not verified: smoke test.
Checks: just tooling-test passed; just lint passed (14.8 s).
