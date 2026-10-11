# Expandable demonstration catalog

Implement the owner's chosen illustrated Variant C on fresh origin/master f290520. Source prototype: c6a2155 on codex/prototype-demonstration-motion, original variants 4a18b8a. Preserve the separate prototype checkout and unrelated edits.

Acceptance: production catalog uses compact independently expandable topic headers (first open) and responsive demonstration picture cards, without grid-row voids, repeated crowded calls to action, variant query behavior or switcher. Include all 29 current demonstrations and seven topics, with existing titles, routes and separate available guided-lesson links. Keep starter cards and site identity.

Pictures must match actual fresh route default scenes: actual control points, curve shapes, visible constructions and colors, rather than prototype hand-picked schematics. Generate versioned static images from the real graph owners/rendered initial scenes; do not mount boards in the catalog. Record capture source/settings and reproducible regeneration. Do not restyle actual graph workspaces; improvement to match the illustration style is later work. Family thumbnails remain conceptual topic icons with existing explanatory copy.

Keyboard disclosure works with visible focus, correct expanded/controls semantics and hidden links unavailable to focus. Check 390/724/1440px, no horizontal overflow, readable labels and lesson target sizes. Verify all image mappings exhaustively, TypeScript, production build, focused component coverage for expansion and destinations, browser production catalog and representative graph/lesson navigation. Record review/verification and commit only accepted production code. Push a fast-forward to origin/master after fetching and rechecking fresh changes as required by AGENTS.md.

## Preview capture provenance

The 29 demonstration-card images are PNG captures of each route's live `#jgbox` from a production build. `scripts/capture-demonstration-previews.cjs` reads ordered IDs and routes from `tests/smoke-catalog.cjs`, opens each route in a fresh local/session-storage browser context, waits for visible JSXGraph content and MathJax startup/typesetting, and captures the exact board client box. The capture-only view uses the starter-card 360:220 CSS ratio, 2× device pixels, equal x/y user-unit scale, and 12% scene padding; it never changes graph data, presets, route defaults, or runtime source. Capture-only typography sets JSXGraph text and rational smart labels to 11px while preserving their content. Framing starts from finite visible construction bounds and allows at most three text-aware refits after zoom so construction annotations stay inside the board; axes, ticks, tick labels, and grid do not determine the scene bounds. Geometric routes hide those context objects, while `bernstein`, `linear-function`, `exponential-function`, and `trigonometric-functions` retain them. Tick labels at coordinate-frame edges may be clipped naturally, and unbounded function curves are clipped by JSXGraph to the board viewport. The generated `src/demonstrationPreviewAssets.ts` imports one image per ID and uses `Record<DemonstrationId, string>` so catalog coverage stays exhaustive as routes change.

Regenerate after `npm ci` by building the app, serving that production build from a second terminal, then running the capture script from a third terminal in PowerShell:

```powershell
npm run build
```

```powershell
$env:SMOKE_PORT='3013'; node scripts/serve-smoke-build.cjs
```

```powershell
$env:PREVIEW_BASE_URL='http://127.0.0.1:3013/bezeg-2.0'; node scripts/capture-demonstration-previews.cjs
```

The generator requires the Playwright Chromium installed for this repository and network access to the app's MathJax CDN. Each run rewrites the 29 images, exhaustive TypeScript map, and `src/images/demonstrations/catalog/manifest.json`. The manifest records the graph-source commit, route, capture server and browser, 1440×850 viewport, device-pixel ratio 2, Slovenian locale, light color scheme, reduced motion, timezone, native PNG dimensions, SHA-256 hash, per-route axes/grid policy, fitted scene bounds, final board bounds, visible object types/count, and rendered/MathJax label counts. The first production capture set was generated from graph-source revision `f290520ce9d49f6b1eac13c89baa59b5c441c2c7` using Chromium `156.0.8078.4`; every board PNG was 794×562. The current closer-framed set was generated from `b567a2a65a508ee2858247cf81054d837bf17d04`; every PNG is 720×440 for a 360×220 CSS frame. Context storage is cleared, routes have no query settings, and all images come from route defaults. The trigonometric-functions route uses plain text for its equation and consequently records zero MathJax labels.

## Acceptance and verification — 2026-10-11

Production C is implemented with independently expandable topics, static default-scene cards, distinct guided-lesson links, and no prototype switcher/query interpretation. The handler increased the image frame from 116px to 160px to keep full-board previews recognizable and restored warm topic backgrounds. Keyboard focus uses an inset outline to stay visible inside the topic border.

Independent engineering/accessibility and mathematical-fidelity reviews found no remaining actionable issues after repairs. The fidelity review checked all 29 routes/map entries/manifest hashes and confirmed graph/geometry/route source remained identical to the fresh-master base. Two pairs share identical images because their untouched default visible scenes match (rational elevation/Farin and C1/symmetric G1); no settings were changed to invent visual differences.

Passed: TypeScript; three focused catalog component tests; production build (existing unrelated CRA/Browserslist/ESLint warnings); all 30 production catalog/route smoke checks; independent SHA-256/dimension/route validation for all 29 images; diff whitespace check. The 30-test browser run used the complete image map before the last CSS-only sizing/focus adjustment; the final CSS adjustment was rebuilt successfully and visually reviewed afterward.

The smoke-tester focused-validation lane applies because production changes are confined to the catalog presentation/disclosures and static assets. Handler browser review on the final production preview observed one/two/three card columns at 390/724/1440px without horizontal overflow, 44px lesson targets, Enter/Space disclosure operation and visible inset focus, no live catalog board, graph-link navigation, and separate Bernstein lesson-link navigation. Graph and lesson entry checks preceded the final CSS-only rebuild; destinations and runtime remained unchanged. Temporary viewport overrides were reset. Physical touch-device and projector checks, a comprehensive accessibility audit, the full guided-lesson regression suite, and remote deployment completion are not claimed.

Capture constraint: development StrictMode raised an existing PH cubic initialization/disposal error; both PH routes rendered successfully in production and all final captures came uniformly from production. This catalog task does not change graph ownership or fix that separate development-mode issue. Improving actual graph aesthetics is deferred as requested by the owner.
