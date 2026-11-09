# Wave 3 O1 repair (o1r)

Items 1-6 done in BezierCurveControls.tsx, InspectorDisclosure.tsx (new optional `onToggle`), DemonstrationWorkspace.css, sl.ts, CurveOperationPanel.test.tsx, ControlsFollowGraph.test.tsx (the old "shorten does not change subdivision parameter" test contradicted item 3 and was rewritten).

Item 2 is moot: `shrinkT` state and the borrow/hold mechanism were removed; Shorten's end is the adapter `subdivisionT`.

Failure evidence: not observed against the old code for the new assertions (old code was not rerun). The only observed failures were against the new code during development: a `jest` typo (fixed to `vi`), and a scheme test that unmounted the whole GraphHost (which destroys the board; rewritten to unmount only the panel). Checks passed: typecheck, lint, `just unit` on base/controls, curves, ControlsFollowGraph.
