# Task 16 UI/a11y review (monotone partition graph)

Verdict: no blocker. Static review only, no browser.

## Should
- src/graphs/compgeo/MonotonePartitionGraph.tsx:377 type labels use fontSize 12; EarClippingGraph.tsx:372 uses 14. Too small for classroom projection (C-1). Expected: 14.
- MonotonePartitionGraph.tsx:335 piece fillOpacity 0.3 is faint on a projector. Pieces are outlined and numbered, so not colour-only, but raise to about 0.4 or check against projection.

## Nit
- MonotonePartitionGraph.tsx:337-338 piece number sits at the vertex average, which can fall outside a concave y-monotone piece or on a diagonal. Prefer a point inside.
- MonotonePartitionControls.tsx:114 play/pause has no aria-pressed; same as BentleyOttmannControls, so it matches the accepted sibling. State is announced by the live region on pause/end.
- sl.ts:1867 "razdelitev na monotone dele" and 1894 "Kosov" vs spec term "monotoni večkotnik": use one term for the pieces (e.g. "monotoni večkotniki") across keys.

## Cleared
- Vertex types: text label (name + type word, localized) plus distinct marker faces (^ v diamond [] o) plus colour (Graph.tsx:39-43, 367-379).
- Side lists reuse SweepSideLists: aria-current="step" on next queue entry, aria-current="true" plus hidden text on current status entries (SweepSideLists.tsx:54,69-74).
- Controls: labelled group, native buttons, aria-disabled keeps focus, same as sibling; examples group labelled.
- Refusals: role="alert", each states the problem and a fix; six reasons all mapped. Live region silent while playing, announces once on pause/end.
- Slovenian: dual forms ("zlivni oglišči", "obe sosednji oglišči sta") correct; terms razcepno/zlivno/pomočnik/diagonala present. English parity: all keys in both files.
- Dark theme: no dark palette exists, n/a.
