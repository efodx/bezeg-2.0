# Typeset SVG export labels with a lazily loaded MathJax SVG output

Accepted on 2026-10-11. SVG figure export re-typesets the board's MathJax labels with `mathjax-full` 3.2.2 (SVG output, lite adaptor), loaded by dynamic import only when an SVG export starts. On-screen rendering keeps the CDN `tex-mml-chtml` bundle. See the [spec](../specs/svg-export-math-labels.md).

Switching the whole app to MathJax SVG output (`tex-mml-svg`) would let export clone the on-screen formulas without a new package, but it changes every formula in the app, including lesson prose, and would need dragging measurements for frequently re-typeset labels (De Casteljau) under the [performance plan](../performance-plan.md). Loading the CDN `tex-svg` bundle on demand would create a second MathJax configuration sharing `window.MathJax` with the page. Converting labels to SVG `<text>` without MathJax would lose subscripts and math fonts.

The chosen option adds an npm dependency that only reaches users who export SVG, in a separate chunk, and keeps the app static and client-only. The bundled version must be kept in step with the CDN version so the exported glyphs match the screen. Routes, presets, PNG export, and on-screen rendering are unchanged.
