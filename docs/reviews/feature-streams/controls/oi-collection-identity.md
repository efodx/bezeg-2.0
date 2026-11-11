# Open item: graph collection identity (s9-1 item 2, step 7 leftover)

- New test: src/graphs/graphCollectionIdentity.test.ts. Builds every graph (graphFactories plus registeredGraphLoaders), takes
  `graph.presetCollection()` (the collection BaseGraph saves/loads with, BaseGraph.tsx:589,729), asserts key in `presetCollections`
  and the same instance as the registered one.
- Why identity, not behaviour: all graphs already return the family module's single instance; identity also catches a rival
  that checks alike today. Constructors need no board.
- Planted rival: ElevationGraph returned `{...curvePresetCollections.elevation}`. Observed failure:
  `elevation: collection "elevation-graph" is a different instance than the registered one.` Restored (git diff clean for that file).
- Passed unplanted. `just typecheck` result: see report.
- Not verified: graphs whose presetCollection() is undefined are skipped (counted only); no source changes made.
