# 03-presenter handoff (partial, budget)

Done: presenter under src/workspace/presenter (BoardCards.tsx, cardSpecs.tsx, layoutConstants.ts, presenter.css, BoardCards.test.tsx); host mount GraphHost.tsx (latched `declared`, `boardOverlay`); DemonstrationWorkspace.tsx stage wrapper + `data-board-cards`; DemonstrationWorkspace.css hides `.function-readout`/`.function-legend` in the inspector; useMeasuredCards: `contentKey` option, `settled`, whenReady failure caught; CardShell.css transition .16s; card hooks renamed `data-card-readout` / `data-card-legend` (graph tests query `data-readout` on the whole document).

Not done / not verified: `just unit src/graphs/compgeo` and the other graph dirs (curves, complex, etc.), `npm run lint`, `just build`, final `tsc` after the last test-typing fix, no screenshots. Observed: unit src/workspace, src/graphs/base, src/graphs/functions, linear+dynamics+patches+projective passed.
