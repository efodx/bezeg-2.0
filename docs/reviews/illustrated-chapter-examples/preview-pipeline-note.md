# Preview pipeline worker handoff

Task 02 capture tooling was implemented in the consolidated-learning checkout at baseline `2c3df6aa32d906f2e10279f1b45b16a1fb23fa09`. Start: 2026-10-26 13:23:41 UTC. Brief revision: handoff-v12. No commit was created.

## Inventory interface

The capture CLI accepts a JSON array or `{ "examples": [...] }`. Each entry requires:

- `id`: stable output and manifest key (also becomes `<id>.png`)
- `demonstrationId`: a route ID from `tests/smoke-catalog.cjs`
- `path`: full canonical path beginning `/bezeg-2.0/` and containing the exact `?example=...` query
- `sceneFingerprint`: 64-character SHA-256 of the resolved prepared scene and actions for this example

Optional `actions` is an array of author-readable preparation descriptions; the capture runner records but never executes it. Optional `expected` accepts `types` (exact visible element counts), `curveCount` (combined `curve` and `functiongraph` count), `points` (expected `[x,y]` coordinates), and `curves` (sample triples matching the board inspector). The inventory producer should derive these values from the resolved registry/lesson scene, not invent a different graph state. In particular, supply independent expected geometry and object types for the worked spline parabola when its stable inventory is available.

Example command after inventory stabilization:

```powershell
node scripts/capture-guided-example-previews.cjs path/to/guided-example-inventory.json
node scripts/capture-guided-example-previews.cjs path/to/guided-example-inventory.json --id curve-parameter --id family.splines.worked-join.spline-c1
```

Full runs replace the prior set and validate the final output against the complete input inventory. Partial runs retain only prior assets whose IDs, demonstration mappings, paths, scene fingerprints, checksums, inventory/presentation/build fingerprints all remain valid. A partial run also requires one prior mapping for every current inventory entry. Unknown/stale retained mappings, missing assets, checksum edits, empty board evidence, and failed scene geometry assertions are rejected.

## Capture and manifest behavior

Each example gets a new browser context with a fixed 1440×920 viewport, Slovenian locale, light theme, and a 2× 420×260 board frame. The runner opens the exact query URL and performs no graph actions. It waits for the lesson UI and JSXGraph board, requires step 1/frame 1 and disabled Back, waits for MathJax/fonts and board settling, then requires the initial geometry snapshot to remain unchanged across 250 ms. It checks that visible JSXGraph elements are nonempty and includes `functiongraph` objects in evidence. `presentBoard` is reused only for capture framing and typography; geometry is checked again afterwards. The existing six Bézier figure generator remains untouched.

`src/images/learning/examples/manifest.json` records per-entry URL, ID, demonstration ID, prepared-scene hash, actions, initial-frame evidence, object/geometry checks, viewport and frame settings, dimensions, and image checksum. Shared provenance includes source revision/dirty state, build stamp/input and output fingerprints, served bundle byte checks, browser, and capture presentation fingerprint. The asset directory is created on first run.

## Changed files and evidence

- Added `scripts/capture-guided-example-previews.cjs` and `scripts/guided-example-preview-api.cjs`.
- Added `scripts/guided-example-preview-api.test.cjs` with negative fixtures for empty inventories/boards, unknown or stale mappings, stale scene fingerprints, missing and edited files, and changed partial fingerprints. Full regeneration explicitly replaces removed prior mappings.
- Added the guided-example capture usage to `docs/commands.md`.
- `node --check` passed for the three new `.cjs` files.
- `node --test scripts/guided-example-preview-api.test.cjs`: 5 tests passed. These negative fixtures provide the requested failure/mutation evidence.
- `just lint scripts/capture-guided-example-previews.cjs scripts/guided-example-preview-api.cjs scripts/guided-example-preview-api.test.cjs`: passed.
- `just --list`: passed.

No production build or browser capture was run because the parent requested waiting for the stable registry/content inventory. This leaves live route compatibility, the exact worked-parabola numerical expectations, and rendered PNG review unverified. The capture runner intentionally depends on the later inventory to supply those expectations.

## Handler review repair round 1

The handler requested stronger geometry and identity gates. `verifyEvidence` now requires a visible graph element type (curve/functiongraph, point, line/segment, polygon, circle, arc/sector, ellipse/conic, spline, turtle, or arrow), so axis/tick/text-only boards fail. Every visible curve or function graph must have exactly three finite `[x,y]` samples, and authored expected curve triples are validated and compared numerically. Published manifests now check `demonstrationId` as well as path, fingerprint, asset name, and checksum. Inventory paths must contain exactly one `example` query, no extra scene query, and its final identity segment must equal `demonstrationId`.

Added negative fixtures for axis-only evidence, missing/malformed/non-finite curve samples, conflicting query parameters, mismatched demonstration identity, and published demonstration mapping. Re-ran `node --check` for the changed API/test, `node --test scripts/guided-example-preview-api.test.cjs` (5 passed), and targeted `just lint` (passed). Production build and live captures remain intentionally unrun.
