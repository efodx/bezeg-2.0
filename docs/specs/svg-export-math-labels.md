# Math labels in SVG figure export

Scope: make "Export SVG" (`downloadSVG` in `src/graphs/base/export/FigureCapture.ts`, also used by batch export) include the HTML-rendered labels that appear on the board, with MathJax typesetting, without changing PNG export, on-screen rendering, routes, or presets. The dependency choice is recorded in [ADR 0008](../adr/0008-export-time-mathjax-svg-typesetting.md).

## Problem

JSXGraph draws labels with `useMathJax: true` (point names such as `p_{0}`, axis ticks, De Casteljau labels) as HTML `div.JXGtext` overlays that the page's CDN MathJax typesets as CHTML. SVG export serializes only the renderer `<svg>`, so these labels are missing from the file. The CDN bundle (`tex-mml-chtml`) has no SVG output, so it cannot provide paths for the file.

## Behavior

- SVG export serializes a clone of the renderer root; the live board DOM is never modified.
- Each visible `div.JXGtext` inside the capture container is added to the clone:
  - Every MathJax-typeset formula in it (an `mjx-container` whose MathItem from `MathJax.startup.document` gives the original TeX and display mode) is typeset again to SVG by MathJax's SVG output with `fontCache: 'none'`, so the file contains glyph paths and needs no fonts. It is placed as a nested `<svg>` filling the formula's on-screen box, positioned relative to the renderer root (accounting for CSS scaling of the root), and uses the label's computed color and opacity (`currentColor`).
  - A label without typeset math and with non-empty text becomes an SVG `<text>` with the computed font family, size, color, and its on-screen position.
  - Hidden labels (`display: none`, `visibility: hidden`, zero size, or zero opacity) and labels entirely outside the renderer root are skipped.
- The SVG typesetter is `mathjax-full` 3.2.2 (matching the CDN version), loaded by a dynamic `import()` only when an SVG export starts, using `liteAdaptor` so it never touches the page DOM or the CDN `window.MathJax`. It is loaded once and reused.
- If loading or typesetting a formula fails, the export fails through the existing `reportFigureExportFailure` path; it never silently writes a file without its labels.
- The existing readiness, cancellation, and timeout rules still apply; typesetting runs inside the bounded owned waits.
- Formula rendering code is a separate module under `src/graphs/base/export/` and is injectable through `FigureCaptureDependencies` for tests.

## Acceptance

- Unit tests (jsdom, with the typesetter injected) cover: a math label becomes a positioned nested `<svg>` using the TeX source; a plain label becomes `<text>`; hidden labels are skipped; the live DOM is unchanged; a typesetter failure fails the export; and cancellation during typesetting downloads nothing.
- A unit test with the real `mathjax-full` typesetter checks that `p_{0}` produces path data (no `<text>` or font references).
- In a browser on the production build, the SVG export of the default Bézier demonstration contains typeset `p_0`…`p_n` labels at their on-screen positions, verified visually by rendering the exported file. The new chunk loads only on SVG export, not on initial page load.
- `npx tsc --noEmit --pretty false`, the figure export unit tests, and the production build pass.
- `docs/current-architecture.md` and `docs/ui-functionality.md` describe the new SVG behavior.
