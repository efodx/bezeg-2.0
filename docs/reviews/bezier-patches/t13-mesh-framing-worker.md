# Task 13 mesh framing worker note

Worker start: 2026-10-29 15:57:55 UTC. Scope: rendered surface mesh crop bounds and guided capture validation in the assigned surface view and capture tooling files. No formula, evaluation, or drawing coordinates changed.

`ThreeSurfaceView` now publishes a conservative screen-space rectangle for the complete indexed `surfaceMesh` geometry, alongside camera and projected control points. It computes local bounds from the uploaded position/index buffers once per `BufferGeometry`, then projects the eight enclosing-box corners on camera or size changes. Optional polylines, planes, and markers do not contribute. Missing ownership, hidden/empty geometry, failed rendering, context loss, reconciliation, and disposal clear stale framing/owner attributes.

The surface evidence reader and capture validators require finite ordered mesh bounds, an in-frustum result, and bounds within the post-resize capture frame. Bounds and owner samples are retained and checked again in prepared and published manifests. Point-free views use the same owner expectations: the 32-patch teapot cardinality remains pinned, and subdivision owners can be validated without control points. Surface reader/validator helpers are included in presentation fingerprints.

Focused coverage includes actual `buildTeapotScene` and point-free `withSubdivisionPieces` scenes rendered through the adapter with fitted valid cameras, rejection of cropped/behind-camera/nonfinite/missing bounds, a far optional line excluded from mesh bounds, and no indexed-vertex reread during a camera-only orbit. Capture tests verify valid point-free teapot and subdivision owner evidence and retained-record revalidation. For mutation evidence, I temporarily bypassed the post-resize crop predicate and ran the focused capture test; it failed at the expected `Missing expected rejection`, then I restored the predicate and reran the complete focused suites successfully.

Checks on this worktree:

- `npx vitest run src/graphs/patches/surface-view/threeSurfaceView.test.ts --reporter=dot`: 42 passed.
- `node --test scripts/guided-example-surface-evidence.test.cjs scripts/guided-example-preview-api.test.cjs scripts/capture-guided-example-previews.test.cjs`: 24 passed.
- Focused `just lint` over the eight changed implementation/test files: passed.
- `just typecheck`: blocked by concurrent out-of-slice syntax error at `src/learning/content/patchGuidedExamplesBasics.ts:83` (`TS1135: Argument expression expected`). The worker did not edit that file.

No production build or browser capture was run; handler owns those checks. This verifies producer geometry and the capture validators with fixtures, not published surface captures or manifest assets. A concurrent unassigned diff appeared in `docs/reviews/bezier-patches/t12-source-ci.md` while working; it was preserved untouched. No commit or push was made.
