# Controls open items (low): patches, insertion, knot drag

1. PatchPointEditor: `points` now `useMemo` on x, y, z (PatchPointEditor.tsx). New test
   PatchPointEditor.identity.test.tsx (mocks PointListInput, compares list identity). Pre-fix failure observed:
   "expected [[1,2,3]] to be [[1,2,3]]". PatchPointEditor cannot itself show a refusal (onCommit returns void), so the test checks
   identity, not a visible notice.
2. Derivatives corner select: closed as correct. TensorDerivativesPanels.tsx:28 uses ChoiceSelect with visible label
   `patch_derivatives_corners` (ChoiceSelect.tsx:23, htmlFor); only options carry aria-label (per-corner), no select aria-label.
   TensorDerivativesGraph.test.tsx:39 already finds it by label. Unchanged.
3. Insertion refusal after language switch: reproduced. Cause: numbers in message params were formatted at refusal time
   (`2,5` stayed after switching to en). Fix: `Refusal` in src/inputs/RefusalChannel.tsx may be a function resolved at render;
   BSplineInsertionGraph.tsx insert() passes `() => insertionRefusalMessage(...)`. Test in BSplineInsertionGraph.test.tsx
   ("separator of the language shown"). Pre-fix failure: "expected 'The knot 2,5 lies...' to contain 'knot 2.5 lies'".
   Other graphs that pre-format numbers into refusal params may have the same flaw (not searched).
4. Knot drag refusals: test-only, bsplineBasisModel.test.ts "each refused drag reports its reason in the language shown"
   (multiplicity_too_high, empty_domain, wrong_length, sl and en). No defect found. No pre-fix failure (existing behaviour).
   not_finite/decreasing cannot arise from a drag (clamped to neighbours and KNOT_LIMIT in dragKnotEdit... not_finite
   at line ~92 belongs to the typed path).

Checks: just typecheck passed; just lint on touched dirs passed; just unit src/inputs src/graphs/patches src/graphs/curves/bspline
see .command-logs/oi-patches-unit.log. `just check-changed` refused to start: another run (pid 9028) was already active in this
checkout; its log is not mine, so the full check-changed result is NOT verified by this worker.
