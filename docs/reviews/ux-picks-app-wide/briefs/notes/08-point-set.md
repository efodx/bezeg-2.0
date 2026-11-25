# 08 step 2, slice 3: point sets (PointSetGraph)

## What changed
- `PointSetGraph.tsx`: opt-in `declaresPointSetWorkspace()` (default false); `declaration()` is then `commonPointSetDeclaration()` (+ `pointSetNotes()` when non-empty), else `undefined`.
  Hooks: `overlayMessage(id)` (switch text as a Message; throws for an overlay a declaring subclass did not name), `overlaySwatch(id)` (legend kind + colour; undefined = no entry), `overlayIsPuck(id)` (default Orodja), `pointSetNotes()`.
  Marks: every point `must`; a closed polygon of 3+ points adds its outline as one `nice` polyline. Legend: `points` + each overlay with a swatch. Actions: each overlay id, plus `closed` in polygon mode. `drawnObject` resolves `points` and swatched overlays (visible = shown and drew objects; colour = the swatch); `performAction` flips an overlay or `closed` as the learner. The base now records the objects each overlay drew (`overlayDrawn`).
- `PolygonAreaGraph.tsx`: opts in; `areaNotes()` (pure, Message list) is the one source of the readout sentences: the panel renders them (`renderMessage`) and the declaration carries them as notes; the area panel is `data-declared-panel` and each sentence `data-readout-note`. Ids exported as `PolygonAreaIds`.
- `compgeoGuidedLessons.ts`: local `frame` got an optional `declare`; `areaFrame` highlights on area-shoelace-step, area-reverse, area-pick-step, area-self-intersecting (the other graphs' frames in the file untouched).
- Test `PolygonAreaGraph.declaration.test.tsx` (12); parity sample + `compgeo/__parity__/polygon-area.json`.

## Placement (05 rule)
- fan, lattice: board pucks (lessons flip them while watching the polygon); the old Orodja checkboxes are already `PuckOwned` by overlay id.
- grid, values, closed: tools, section `display` (grid and numbers are background settings; closing changes what is edited). Their Orodja checkboxes stay.
- Stays in Orodja: mode choice, example/preset selects, point list, add/remove/clear/Add mode, refusals, Reverse order.

## Findings
- The area panel had no `data-readout-note`, so parity recorded nothing; the markers were added before recording (text unchanged), then the recording taken, then the declaration added.
- Legend colour comes from the swatch hook, not from the drawn element: the overlays draw several objects (fan: diagonals, fills, labels; lattice: two marker colours), so no single element stands for them. Lattice shows the boundary-square colour.
- No point parameter kind, so `parameters` is undefined and the arbiter has no keys.

## Recipe: converting one PointSetGraph subclass
Owned: the graph file, its lesson file(s) (local `frame` helper only), its declaration test, its sample + recording.
1. Record first. If its readout has no `data-readout-note` markers add them (text unchanged), add a `SAMPLES` entry (every state changes a shown sentence; apply through `runAs('learner', ...)` with `loadModel`, `setOverlay`, `setPolygonClosed`), `BEZEG_PARITY_RECORD=1 just unit src/graphs/base/declare/parity.test.tsx -t <id>`.
2. Move the sentences into a pure function returning `{id, text: Message}[]`; render the panel from it; override `pointSetNotes()`. Wrap the panel in `data-declared-panel`.
3. Override `declaresPointSetWorkspace()` true, `overlayMessage` (every overlay it lists; the base only knows `grid`), `overlaySwatch` for overlays worth a legend entry, `overlayIsPuck` for what a lesson flips while watching. Puck overlays are already wrapped in `PuckOwned` in `PointSetControls`.
4. Per-subclass look: `workspaceEdit` (readout above `super.workspaceEdit()`; wrap it in `data-declared-panel` once notes cover it), `showsModeToggle` (a hidden mode toggle: mode is not declared anyway), `showsClosedToggle` (false: no `closed` action; the base checks it), `beforeSettings` (example selects stay in Orodja), `overlayIds` (every id needs `overlayMessage`; an id the subclass draws through `drawModelObjects` is not an overlay), `overlayInputs`. A subclass with its own `declaration()` spreads `...this.commonPointSetDeclaration()` and, if it overrides `drawnObject`/`performAction`, calls `super` for the common ids. Segments/intervals modes: the marks list endpoints as points (no segment marks yet).
5. Test: copy `PolygonAreaGraph.declaration.test.tsx` (checkDeclaration empty, marks = model points over >= 5 states incl. move/add/remove/open, legend resolves, switches flip `pressed`, notes equal the panel); break marks once.
6. Checks: `BEZEG_PARITY_CHECK=1 just unit src/graphs/base/declare/parity.test.tsx`, `just unit src/graphs/compgeo src/graphs/base src/learning/content`, `just graph-check <id> --base`, `npx tsc --noEmit --pretty false`, `just lint <files>`.

## Observed
- Red: marks `y + 1` fails 8 of 12 (log `.command-logs/p3-red.log`); restored.
- Parity check mode passes (`p3-parity.log`); unit compgeo+base+learning/content passed (`p3-unit.log`, 523 s); tsc empty (`p3-tsc.log`); lint passed.
