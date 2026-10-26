# Renderer browser smoke — 2026-10-26

Preview: development server owned by the handler at `http://127.0.0.1:4181`, rooted at `.command-logs/patches-acceptance`; JSXGraph page `/docs/prototypes/bezier-patches/`, three page `/docs/prototypes/bezier-patches/three.html`. Chromium 156.0.8078.4, desktop 1440×1000; planned narrow run was 390×844 with touch emulation. Both pages returned HTTP 200. Runtime versions were JSXGraph 1.14.1 and three.js r180. Served SHA-256 matched the edited checkout for all six page/source files:

| File | SHA-256 |
|---|---|
| `index.html` | `a3baab5ef98e8a29f131dc345c190ac78f0ea092e589be1d8dec7e01eb257971` |
| `prototype.js` | `6d9a29a1aaf298a346b96b098122049d97e73efca4e538c57d34babfcd2cfa2b` |
| `style.css` | `287004fff163a8cf282b7570ea677534acfa5d07c60e22dde7cc886570a3463a` |
| `three.html` | `08c9154741623214a5fd49ad24aa1c0b92e78a2e1f76635d7cf92325a0624c7f` |
| `three-prototype.js` | `c5c67d0c577f8b6e84323827fb0d9704b28249f401190445fc7f517372f4c3da` |
| `three-style.css` | `47a7eb9a0c23aa71afe4ce1c9002bf26a73e96486d1d52434af060df9d2b3b56` |

| Check | Status | Evidence |
|---|---|---|
| Page load and renderer identity | Passed | Both pages loaded; no page errors during preflight. Both renderers showed the tensor scene. |
| Four desktop camera presets | Passed for capture; depth acceptance incomplete | Front, top, side and isometric screenshots were saved for both renderers. Three’s isometric shows a shaded surface, iso-curves, control net and labels. JSX’s mesh view shows 64 triangular faces, but the net/surface depth ordering is visually ambiguous in the oblique view. |
| Mouse XY drag | Passed for JSX triangle | During-drag screenshot shows control point 5 at `(-2.607, -0.158, 1.00)`; its preset is `(-2, 0, 1)`, so XY moved while Z stayed at 1. Three’s equivalent numeric record was lost. |
| JSX triangular mesh live update | Incomplete | Before/during screenshots exist; the surface remains visible, but the face geometry comparison was not retained, so this does not establish live face updates. |
| SVG export | Passed | JSX SVG 1,055,412 bytes; three SVG 50,204 bytes. Both contain shaded-surface color and label strings. |
| PNG export | JSX failed; three passed | JSX produced no download. Three PNG is 75,386 bytes; visual inspection shows the triangular surface and control-point labels. |
| Presentation resize and lifecycle | Incomplete | The JSX page completed three remount actions and remained visible in the final screenshot. Board/listener counts were not retained. Three’s lifecycle recorder stopped before remount checks. |
| Narrow touch, touch Z, inset response, keyboard orbit, actual teapot render | Skipped | The run stopped in desktop lifecycle instrumentation before these checks. The vendor fixture request succeeded; its reviewed shape is 512 indices (32×16), 290 xyz points, source revision `0af9729d0c143a86a1d725d6e2c3ad83301f3f34`; sentinels match the review note: first indices `[0,1,2,3]`, first point `(1.4,0,2.4)`, last `(1.5,-0.84,0.075)`. This is fixture evidence, not a visible teapot pass. |

The runner stopped on its Three lifecycle probe because it referenced the JSXGraph-only global `JXG`. That is a harness failure, not an observed renderer exception. Durable captures and downloads are in [renderer-smoke-artifacts](renderer-smoke-artifacts/). The original harness is `.command-logs/patches-renderer-smoke/verify-renderers.cjs`; no raw JSON result was written before its failure. Browser contexts closed on exit. The handler later stopped the preview server. This partial smoke establishes no performance, physical-device, or production-hosting result. The selected smoke set did not fully pass. These observations concern the original sources at `3e1bbc1`, before the fidelity corrections.
