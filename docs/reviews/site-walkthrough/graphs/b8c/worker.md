# B8c worker note
- Table entries (captureText): delaunay, monotone-partition, monotone-triangulation, all Remove. Triage said keep `^v\d+` in part for the monotone ids; changed to Remove because the poster shows the v labels under the point glyphs, square and ring (overlap rule). monotone-triangulation changed by the same reasoning, its poster not seen.
- Test list updated (delaunay, monotone-partition, monotone-triangulation).
- Captured and published: delaunay, monotone-partition (manifest captures/motions changed only for these two).
- NOT done: monotone-triangulation. The page crashes ("Target crashed") in settle at the 32nd Naslednji korak press (recipe step 33), at HEAD too (scripts/demonstration-preview-recipes.cjs settle, called from applyAction). A plain Playwright click-through without typesetting passes; with MathJax typesetPromise per step it crashes. Its manifest provenance is now stale (recipe entry added), so a whole-set publish requires its recapture; the two others were published with its entry temporarily removed and then restored.
- Checks: just tooling-test (see report).
