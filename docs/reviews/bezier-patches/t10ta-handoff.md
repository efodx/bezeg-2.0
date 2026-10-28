# 10T-A teapot capstone handoff

Implemented in the current shared worktree; no commit or push. The capstone is a read-only `joinCapstone: "teapot"` Preset in `patch-joins`, leaving its route, default pair, and legacy Presets intact. It keeps the pinned raw z-up coordinates (`blinn: true`, `fitLid: false`, no display transform), with 8×8 shading cells, optional boundary curves, and no point/net/inset/iso geometry. Lid and bottom zero-area cusp faces are filtered while every patch's vertices remain in the merged mesh.

The asset is at `src/graphs/patches/teapot/utahTeapot.ts`, with its source, Newell/SPD attribution, selected transforms, SHA-256 values and retained MIT notice in `src/graphs/patches/teapot/PROVENANCE.md`. Literal parity against the prototype is exact: 512 indices and 870 coordinate values. `resolveTeapotPatch` returns source row-major `P[r][c]` and validates its index.

Boundary check found 52 two-edge exact-sharing groups and two four-edge collapsed cusp groups (64 pair relations total); 16 boundary rows are unshared. All 64 shared pairs' sampled 33-point curves coincide within `1e-12`. Scene acceptance is 32 owners, 2,592 vertices and 4,032 faces after filtering 64 cusp faces. Graph tests cover Preset round-trip, read-only controls, Reset/default-pair return, and UI language changes. Slovenian UI uses **čajnik iz Utaha**, a clear descriptive name for this place-associated object.

Focused verification: four test files, 149 tests passed; `npx tsc --noEmit --pretty false` and scoped ESLint passed. Deliberate mutations were caught for source-point data, shared-boundary data, cusp filtering, DTO validation, graph scene selection and capstone panel selection; each was reverted. Logs: `.command-logs/t10ta-*`.

Browser smoke, export/resize checks and integrated orbit-frame measurement remain with 10T-M/handler. No source edits are pending in this slice.
