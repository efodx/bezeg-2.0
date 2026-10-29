# Task 13 mesh framing engineering review

Started: 2026-10-29 16:03:20 UTC

## Finding

- **P2 — Validate retained prepared-frame bounds against their frame.** [`guided-example-preview-api.cjs:164`](../../../scripts/guided-example-preview-api.cjs#L164) revalidates `initialFrame.preparedSurfaceEvidence` through `validateSurfaceEvidence`, which checks that `meshBounds` is finite and ordered but does not require `inFrustum === true` or that the rectangle lies inside the recorded frame. The subsequent crop check at lines 191–207 only validates `capture.scene.meshBounds`. A published/retained manifest can therefore preserve cropped prepared-frame evidence while its later capture scene remains valid. Require crop validation for prepared evidence against its own `record.frame`, and add a retained-manifest mutation with an out-of-frame or false-frustum prepared bounds rectangle.

## Review coverage

Inspected the assigned producer, guided capture/evidence readers, manifest validation, diff, direct consumers, task/spec guidance, and worker evidence. The uploaded indexed mesh supplies the bounds; camera-only updates project cached local bounds; reconcile, hide, render failure, context loss, and disposal clear evidence. Optional line geometry is excluded. Capture resize waits for dimensions before validating bounds. Tests exercise actual teapot/subdivision scenes without control points, rendered-owner sampling, malformed bounds, capture cropping, and published scene recapture.

Diagnostic: `validateSurfaceEvidence` accepted a finite rectangle with `left: -50` and `inFrustum: true`; this confirms the missing frame relationship. Worker-reported focused tests and lint passed. Build/browser capture were not run by the worker and remain handler acceptance coverage.

## Handler disposition

Repaired the prepared-frame crop gap in `validateSurfaceEvidence`, which is shared by live and retained evidence. Added prepared-frame mutations for a negative left edge and false frustum. The new regression first failed with `Missing expected exception` (`.claude/scratch/t13-mesh-prepared-red.log`); after requiring mesh containment and true frustum against each record's own dimensions, all 24 focused Node tests passed (`.claude/scratch/t13-mesh-handler-node.log`). This is a local validation repair; no interface or projection mathematics changed. Production build/browser checks remain tracked separately.
