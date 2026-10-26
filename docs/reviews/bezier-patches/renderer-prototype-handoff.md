# Renderer prototype handoff — 2026-10-26

Prototype files are under `docs/prototypes/bezier-patches/`. Start from the repository root with `node docs/prototypes/bezier-patches/server.mjs`, then open `http://127.0.0.1:4177/docs/prototypes/bezier-patches/`. Set `BEZEG_SPIKE_PORT` to use another loopback port. It serves repository files only from a loopback-bound, no-cache Node server; no dependency or production files changed.

## Current implementation

- `index.html` and `prototype.js` load the installed JSXGraph distribution directly. The page owns a main board and a separate parameter board, each freed on disposal. The main board has a `ResizeObserver`; the inset and graph are also resized on window changes. Remount creates fresh boards. Application UI handlers are registered once and remain available across remounts.
- The default bicubic control net has 16 editable points in flat row-major order and a nested 4×4 evaluation grid. Inline tensor Bernstein evaluation is checked against nested de Casteljau evaluation. The cubic triangular net has 10 points in canonical order and is checked against a simplex de Casteljau reduction.
- Both modes draw shaded surfaces, boundary and iso curves, net points/edges, and a visible de Casteljau construction. Triangular parametric rendering maps square parameters by `(s,t) -> (s(1-t), st)`. The comparison renderer makes a triangular sample grid and creates shaded `polygon3d` faces.
- The parameter board overlays a unit square and reference triangle, and clamps the dragged parameter for the triangular patch. Presets, keyboard orbit after graph focus, pointer orbit, a visible z-drag checkbox, presentation-like expansion, SVG/PNG export buttons, repeated-patch stress UI, and a small `window.BezierPatchSpike` API are present.
- Installed JSXGraph source registers `polygon3d`; searches of installed `src/3d` found no `face3d` or `polyhedron3d` registration. The spike therefore uses the available polygon face primitive. Treat this as a naming/API mismatch in the task description, not evidence for a custom primitive.

## Evidence collected

- `node --check` passed for `prototype.js` and `server.mjs`.
- Extracted the exact inline math helper block from `prototype.js` and executed `assertMath()` under Node. Results: tensor max error `1.1102230246251565e-16`; triangular max error `3.3306690738754696e-16`. Both checks throw if the difference exceeds `1e-10`.
- Playwright loaded `index.html` on the local server without page errors. The default snapshot reported 16 net points, 16 draggable points, one 3D surface, an SVG board, and the same math assertion results.
- Triangular `polygon3d` mode at tiling 8 rendered 64 triangular faces. Raising to tiling 16 produced 256 faces and 4,486 total JSXGraph objects; the UI rebuild took about 3.9 seconds in headless Playwright. This is a reconstruction time observation, not a drag/orbit frame-time measurement.
- Empty-space mouse orbit changed azimuth from `1.0000000000000004` to `1.2763864504624454`. Keyboard orbit initially did not fire after SVG click; the prototype now focuses the board on pointerdown. A later check observed `document.activeElement.id === "main-board"` and azimuth change from `1.0000000000000004` to `0.9200000000000005` on ArrowRight.
- A real mouse gesture moved the native JSXGraph point object in screen-projected 3D coordinates, but the first attempted listener on the `Point3D` wrapper did not update the prototype's net snapshot. The code now listens on `point.element2D` for `down`/`drag`/`up` and updates the flat net and tensor grid there. This last repair has **not** been verified in-browser; a retry was interrupted when the browser process stopped responding. Verify this before using drag timings.
- SVG/PNG download, presentation sizing, z-mode height changes, disposal/remount, the 32-repeat stress scene, and touch input still need browser checks. No screenshot or physical-phone evidence has been collected. The 32-patch scene uses translated repeats, not teapot data.

## Known limitations / next checks

The installed `polygon3d` mesh has no separate grouped/polyhedron owner; its many face elements may stress JSXGraph creation and removal. The 16×16 UI rebuild took about 3.9 seconds in this headless run. Check face ordering and object disposal with the target desktop and phone before choosing a renderer. The point drag hook, `z` mode, actual export output, parameter-board disposal, and repeated mount cleanup remain unverified. PNG serializes the JSXGraph SVG to a canvas; HTML labels may not be included.

The basic window API is `ready()`, `snapshot()`, `editPoint(index, xyz)`, `setParameter(u,v)`, `camera(name)`, `counts()`, `pointInfo(index)`, `dispose()`, `remount()`, and `assertMath()`. Browser pointer and key gestures still need direct exercise; API calls alone do not verify those paths.

## Process state and hashes

The elevated local server ran on `127.0.0.1:4179` in exec session `87210`; that session was stopped with Ctrl+C. Port 4177 returned `EADDRINUSE` when attempted and was not left running. Playwright exec sessions `27493`, `70376`, `87116`, `69787`, and `28820` were stopped or exited. `netstat` showed no listener on 4177 or 4179 at handoff. No browser or server session is intentionally left active.

SHA-256 at handoff:

| File | Hash |
| --- | --- |
| `index.html` | `A3BAAB5EF98E8A29F131DC345C190AC78F0EA092E589BE1D8DEC7E01EB257971` |
| `prototype.js` | `5C738784B2FD8A67E91CE2E96836248D1C65F01781B9705588FAABAAD16E9F86` |
| `style.css` | `287004FFF163A8CF282B7570EA677534ACFA5D07C60E22DDE7CC886570A3463A` |
| `server.mjs` | `A075C1263315DB69CBACCFE0DB5302D00DAD4BF00DCA489BF3640C8E40C9AE47` |

This is prototype evidence only. No ADR, renderer selection, interaction budgets, or production route changes are implied.
