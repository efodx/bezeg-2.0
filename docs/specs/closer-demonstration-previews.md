# Closer demonstration preview framing

Update the catalog screenshots to use the starting cards as a visual reference. Preserve default curves and meaningful constructions; only capture-time presentation changes are allowed.

Acceptance:
- Remove axes, ticks, and grid from geometric curve/construction previews. Retain coordinate context for Bernstein, function analysis, and coordinate-dependent topics where it explains the concept.
- Fit the complete meaningful scene more tightly, retaining control points, labels, offsets, and extrapolation. Preserve aspect ratio and leave enough padding to avoid clipping.
- Capture at the starting preview aspect ratio (360:220), with readable curves and points; retain static PNG assets and exhaustive route mapping.
- Do not change graph route defaults, mathematics, presets, catalog links, or starter cards.
- Record per-route framing and grid/axis policy in the capture manifest and update capture documentation.
- Verify all 29 assets, TypeScript, production build, and desktop/narrow catalog views.

Verification (2026-10-11): handler reviewed all 29 images in a contact sheet and representative Bézier, De Casteljau, rational, extrapolation and PH images. TypeScript, three focused catalog component tests, production build, all asset hashes/dimensions/routes, and the production browser catalog check passed. Focused smoke-tester lane: final production catalog disclosure and desktop/390px previews were checked, with no horizontal overflow or console errors. Coordinate plots retain their natural curve/tick clipping; the final containment assertions cover finite geometric scenes and scene annotations. Existing duplicate endpoint labels remain where the default constructions name the same point twice. Physical-device and projector review were not performed.

The screenshot generator applies capture-only 11px annotation typography and bounded text-aware refitting, including rational weight labels. Runtime graph source, presets, routes, and starter cards remain unchanged.
