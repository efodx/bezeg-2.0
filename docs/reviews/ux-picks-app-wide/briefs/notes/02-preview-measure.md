# 02 preview-measure handoff (worker, partial)

Done (all under src/graphs/base/preview/experiment/, experiment code only, no graph class changed):
- paths.ts: Path type, curvePaths(jxg element), pathDeviation (symmetric polyline distance).
- subjects.ts: Taylor (degree), De Casteljau (t), phase portrait (matrix entry A): create / withValue(snapshot) / readPaths (B, element access to private `drawn`, `getFirstJxgCurve`, `drawnElements`) / geometry (A, pure; `sampledRange` = visible box +10% each side, observed JSXGraph function sampling).
- shadowBoard.ts: openShadow (hidden fixed 600x400 div, mount), loadSnapshot (runAs('learner', importPreset) + flushStateChanges + board.update), closeShadow (unmount + remove host), captureShadow (cold), captureOnOpenShadow (warm), liveBoardCount (JXG.boards).
- previewOptions.test.ts: A-vs-B tests, perturbed-state check, leak test (boards, window/document listener net, host removed, live preset unchanged). NOT YET GREEN.

Findings:
- Snapshot = live.exportPreset(), not graph.state: De Casteljau control points are board objects; a dragged point (moveTo + triggerEventHandlers(['drag'])) appears in exportPreset().data but not in state (state has only t, v, animationStatus).
- A vs B Taylor/phase match with defaults (De Casteljau default t=0.4 endpoint equal, phase equal). B functiongraph is an adaptive polyline (chord error up to ~0.02), so TOLERANCE 0.05.
- BUG to fix next: for De Casteljau, `importPreset` on a mounted shadow (which already holds the default scene) ADDS a second curve instead of replacing it (shadow exportPreset().data had two curves, first = default). Curve families need the scene-replacement path (dispose before import). Fix options: load via a path that disposes (e.g. selectPreset/reloadAfterImport with a stored preset, or BaseGraph replaceScene with dispose), or read the LAST curve. Taylor/phase are not affected (single model).
- Perturbed test threshold set to 2*TOLERANCE (phase A -16 vs -4 deviates only 0.279).

Remaining: fix De Casteljau load; get previewOptions.test.ts green and observe one failure with a perturbed state (the perturbed test is the check); fixtures/preview/{index.html,main.tsx} exposing window.__preview (subjects, captureShadow, warm, geometry, board count); scripts/preview-measure/measure.cjs (Playwright, --base, --n, CDP Emulation.setCPUThrottlingRate 1x/4x, frame gaps via rAF + longtask as scripts/probe/probe.cjs INIT, median/p95, JSON + md to docs/reviews/ux-picks-app-wide/measure/preview-<date>.md); `just preview-measure` recipe (justfile + scripts/commands.cjs) and docs/commands.md line; tsc, just build; one tiny smoke vs http://127.0.0.1:4483/bezeg-2.0/ (N<=3, 1x).
