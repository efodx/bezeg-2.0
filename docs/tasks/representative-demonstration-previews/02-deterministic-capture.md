# 02 Deterministic recipes and provenance

Source: [spec](../../specs/representative-demonstration-previews.md), capture approach and motion system. Depends on: [01](01-capture-checkpoint.md).

## Goal and scope

Extend `scripts/capture-demonstration-previews.cjs` with capture-only recipes and small route interaction adapters. Own the recipe contract, manifest version/validator changes, focused tooling tests and capture instructions. Update `tests/smoke-catalog.cjs` and its consumers together: they currently require default-only provenance, one PNG per ID and the existing poster mapping shape.

## Deliverables and acceptance

- An exhaustive recipe registry, including explicit keep-default entries, identifies real route, setup, poster checkpoint, assertions, framing and annotation policy. Motion timelines are optional; their sample/step description is separate from delivery assets. Fail on unknown or omitted shipped IDs.
- Apply setup/actions before capture and verify semantic outcomes, then wait for board, fonts and MathJax. Use supported UI controls first; graph-owned actions require an existing supported access path. No React internals, graph-state mirrors, production bridge or lesson-step coupling.
- Support repeated exact action sequences without timers. Pause runtime animation. A frame fails when a requested transition is unavailable or its asserted outcome is absent; a visible generic curve is insufficient.
- Support a locked camera for all samples: explicit coordinate window or measured union followed by a capture pass. Assert containment/proportions and stable dimensions across the timeline. Keep capture-only label/stroke treatment consistent after updates.
- Version the manifest for recipes, source revision/relevant dirty fingerprint, outcome evidence, poster selection and frame dimensions/hashes. Reserve optional clip provenance for task 04. Keep poster mapping exhaustive and preserve native static-image loading. Any future motion mapping is partial and checked against live IDs.
- Generate into a task-owned staging directory and publish generated outputs only after validation succeeds. A failed run leaves the prior complete assets/map/manifest usable. Prune only obsolete task-owned generated files after success.

## Checks and evidence

Use focused tests for missing/unknown recipes, unsupported actions, failed outcomes, fixed-camera consistency and partial-run failure. Exercise a keep-default route plus Bernstein degree 3, repeated subdivision through round 2 and Farin visibility on a stable real preview. Update provenance checks without weakening own-route, checksum, dimensions or exhaustive-coverage guarantees. Run relevant catalog/tooling tests, TypeScript and production build. Record revision, commands, outcomes and coverage gaps. Full poster curation belongs to task 03.
