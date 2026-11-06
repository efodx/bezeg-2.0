# AB-B-6: criterion audit (D2)

Read-only Sonnet audit against [the spec](../../specs/advanced-bezier-lessons.md) at `02b280fa`, by handler 66. It ran no test, and it read the bodies of the tests it cites. The status column is the worker's, with the handler's corrections marked.

**Handler recheck.** The audit called the margin test vacuous. A mutation disproved that: with `CLIP_MARGIN_FACTOR` at 0, the margin test failed, as did the clip-count test. All of \(A\)'s control points then lie below the band, so the root is discarded. Dispositions are in the [gate record](ab-b-6-gate.md#audit-gaps).

Files: K=src/bezeg/impl/kernels/bezier-clipping.test.ts, L=src/learning/content/bezierClippingGuidedLessons.test.tsx; in src/graphs/compgeo: G=BezierClippingGraph.host.test.tsx, C=BezierClippingControls.host.test.tsx, LA=BezierClippingLessonActions.host.test.tsx, V=bezierClippingView.test.ts, R=bezierClippingReadout.test.ts, P=bezierClippingPresetCollection.test.ts.

| Criterion | Test | Status |
| --- | --- | --- |
| A1 crossing finds 0.25 and 0.75, merged; the offset pair returns empty | K:255, 291, 381; G:115, 144 | covered |
| A2 never discards a root: resultant and dense reference, quadratic and cubic | K:654, 660, 666, 673 (reference K:105, 166; checker K:237) | covered, lenient limit runs |
| A3 tolerance \(10^{-6}\) default | G:115; C:98 | covered |
| A3 cap 200, limit status, depth limit | K:466, 479, 496, 503; L:54 | covered |
| A3 prose: stopping rule, not a proof | L:108 | covered (words in both languages) |
| A3 prose: limit expected near tangency and for coincident segments | L:108 | covered (handler: assertion added in the gate) |
| A4 discard biased to keep, margin \(10^{-12}\) of scale | K:440, 394, 307 | covered (handler: worker said partial; mutation failed) |
| A5 tangent at least 3 times crossing at \(10^{-6}\) | K:270 (113 against 21); G:133 | covered; G:133 alone would pass on status `limit` |
| A6 overlap necessary, not sufficient; finite run proves nothing | L:108, 87 | covered |
| A6 degrees above 3 not offered | P:56; L:108 | covered (handler: the UI side by browser check 13) |
| A7 drag recomputes and resets playback | G:158; C:208 | covered |
| A7 tolerance, import, Reset also reset | G:158; C:98; LA:67 | covered |
| A7 both languages | L:126, 374, 392; C:156, 98 | partial: no English control test; the browser switched language in the lesson |
| Steps 1 to 8 against the shipped eight | L:45, 87 | covered |
| Scenes, backward and jump, closing restores state | L:145, 282, 340 | covered |
| Band, inset, table, status, tolerance, Next, Play, Reset | V:18, 37; R:21, 42, 71; C:136, 188, 208 | covered |
| Presets store points and tolerance; a stale step clamps | P:15, 30; G:197, 214, 226 | covered |
| Spec test line: reference including tangent and no-intersection | K:673; K:291, 496 | partial: named cases are not in the reference loops, but are tested directly |
| Lifecycle | G:184; C:208 | covered |
