# W3 R1f engineering review (7e925b59)

1. Hooks: no finding. No reader misses an element. `data-triangulation="live"` -> `data-triangulation-live`; the only reader, TriangulationGraph.host.test.tsx:56, was updated. No tests/*.cjs or scripts/ reader of step, chip, live or reversed hooks. The `data-readout` readers (tests/*.cjs, `[data-readout=id] dd`) target function graphs, unchanged. Lesson test compgeoPointSetTriangulationLesson.test.ts:28 reads `[data-triangulation="readout"] [data-readout]`, preserved via `hooks`. Step hooks are preserved through `hooks`.
   Minor: EarClippingControls result title h3 class changes inspector-help -> inspector-reveals-title (style change only; no reader).
2. Live regions: no finding. Euler/Notable/Simson/Inversion/Inscribed each render one LiveReadout per branch (branches are exclusive), using `useStatusReadout(text, true)`, so drags are settled and unchanged text is not repeated. None of these graphs plays, so no mute is needed. The only compgeo `role="status"` left is HullRobustnessControls.tsx:142 (decision 39/48 title).
3. StepCounter: no finding. All 10 controls go through the same `step + 1` and `Math.max(length, 1)` as the deleted compgeo/stepCounter.ts; the only change is EarClipping and Delaunay now clamp too (no effect). Nothing uses noun="event" in compgeo (the noun path is only in the shared tests).
4. ReadoutScrollTable (ReadoutParts.tsx, last component): finding. `scrollWidth > clientWidth` is measured in useLayoutEffect on mount, and a ResizeObserver (disconnected on unmount, OK) observes only the wrapper. Content that grows or shrinks inside a fixed-width wrapper (new rows, language switch, larger text) does not resize the wrapper, so `scrolls` goes stale. Expected: also observe the child/table, or re-measure on children change. Where the table width changes while the wrapper does not, the tab stop is missed.
   Minor: when ResizeObserver is undefined it measures once only.
5. Vacuous assertions:
   - ReadoutParts.test.tsx "fits" case: passes with a plain div (never mutation-checked); it passes even if measure never ran.
   - ReadoutParts.test.tsx heading and help test: `role` null and `h3` hold for any `<h3>`/`<p>`; no regression value.
   - ReadoutList tests: the new component is the only producer, so they only pin the shape; not vacuous, but untested against the old DOM.
   - readoutParts.test.tsx:24 `getByRole('list', {name: /.+/})` is loose (it also matches the triangles group if that is a list), and `toHaveLength(6)` is the only real check.
   - readoutParts.test.tsx:32 `.not.toBe('')` is weak (it does not check the sentence).
   - Scrolling case: the jsdom mock with no ResizeObserver covers only the mount-time measure, not resize or content change (see 4).
