# Task 05 worker handoff (partial)

State: steps 1-5 implemented; step 6 tests written, 26 of 28 pass; 2 failing; tsc was clean before tests (not rerun after test edits); production build NOT run; no mutation evidence yet; no smoke (no route).

Files added: src/graphs/compgeo/{PointSetGraph.tsx, PointSetControls.tsx, pointSetPresetCollection.ts, PointSetGraph.host.test.tsx, pointSetPresetCollection.test.ts}. Edited: src/localization/sl.ts (before "invalid_patch_data", line 1183) and en.ts (line 1184): 40 `pointset_*` keys. Logs: docs/reviews/convexity-hulls/05-{tsc,unit}.log.

Interface (module comment in PointSetGraph.tsx): `new PointSetGraph<Overlay>(options?)`; reads model, selectedIndex, isAddMode, pointLimit, notice, simplicity(); edits addPointAt, addPointAtBoard, movePointTo, nudgeSelected, removeSelected, clear, setPointSetMode, setPolygonClosed, loadModel; select, setAddMode; overlays overlayShown/setOverlay; hook = protected overlayIds/overlayLabel/drawOverlay. Preset key `compgeo-point-set` (not registered in PresetImport.ts; needed for file import in F2b).

Known failures:
1. Grid overlay: after switching off, one `grid` element remains on the board (host test line ~244). Likely a leaked child of the JSXGraph grid (two grid objects appear when shown, base removeObject takes one). Real leak candidate; fix in redrawOverlays/removeObjects (remove all board objects whose elType is grid created since, or children).
2. After unmount, container still has aria-label (test line ~269); probably the host/second StrictMode mount sets or restores it; inspect bindInteraction restore.

Remaining: fix both, rerun `just unit src/graphs/compgeo --maxWorkers=2`, two deliberate mutations, tsc, build to 05-build.log, report.
