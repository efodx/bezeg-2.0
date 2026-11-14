# C5 (G06) convexity sweep: worker note

Changes
- scripts/demonstration-clip-rows/analysis.cjs: new `convexity` parameter-sweep row (slider "Točka dotika tangente t", step 0.1 as in ConvexityGraph.tsx:374, path 0.5, -0.5, 1, 0.5; quote = observationPrompt of convexity-tangent-step, analysisGuidedLessons.ts:1771).
- scripts/demonstration-preview-concept-motion.cjs: convexity held-state spec, check, checkpoints and phases removed; ids now ['accumulation'].
- scripts/demonstration-preview-analysis-motion.cjs: the older convexity sweep spec (also a legacy spec, would trip "a row clip must not also have a legacy motion spec") removed with its id, invariant text and budget text.
- scripts/demonstration-preview-concept-motion.test.cjs: convexity tests removed; asserts specs.convexity is undefined.
- scripts/demonstration-preview-motion-runner.test.cjs:10: legacyMotionCount 51 -> 50. Observed failure before the change: `116 !== 117` at lines 33 and 52 (both tests).
- capture-demonstration-previews.cjs:509 (`['extrema','convexity']` conclusion-label tidy in the shared presentation) left unchanged: it keys on id in the shared path and is harmless for a row.

Checks
- `just tooling-test`: passed (208.6 s), after the count fix. Log .command-logs/2026-11-14T12-27-50-177Z-16368-58eb7fc1.log.
- `PREVIEW_BASE_URL=http://127.0.0.1:4333/bezeg-2.0 just clip convexity`: FAILED before any capture, outside the row: capture-demonstration-previews.cjs:664 "Capture presentation fingerprint changed; run full generation or explicitly verify the selective recapture presentation". Published manifest presentationFingerprint (cb28f405...) differs from the current hash of presentBoard + applyCaptureText (changed by the G03/G04 capture-text commit). Log: .command-logs/c5-clip1.log. Not repaired; the bypass is PREVIEW_RECAPTURE_VERIFIED_PRESENTATION=1, a handler decision. One run used.
- No clip/poster written; manifest and media untouched.
