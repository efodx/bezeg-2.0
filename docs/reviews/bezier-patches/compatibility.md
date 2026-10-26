# JSXGraph compatibility findings

## Area between curves

JSXGraph 1.14.1 changes function-graph defaults so `RDPsmoothing` is enabled. The default area-between-curves graph uses two adaptive `functiongraph` objects, and its sampled point arrays feed the scene signature used by Preset and figure-batch restoration checks. With the same Preset data and bounding box, the 1.14.1 samples differed after import (54/56 points, last interior samples shifted by about 0.005). The identical test passes on the clean JSXGraph 1.9.2 baseline.

Explicitly setting `RDPsmoothing: false` on those two function graphs restores stable samples. The existing checks then pass without changing their expectations. The implementation is scoped to this graph; no other curve family was changed.

Evidence:

- Baseline: `just unit src/graphs/base/presets/PresetCatalog.test.tsx -t 'area-between-curves: the default' --maxWorkers=1` — passed on clean `819f737` / JSXGraph 1.9.2.
- Upgrade before compatibility option: same command — failed only at `after.board` sample coordinates; `after.data` was equal.
- Upgrade with compatibility option: same command — passed.
- Upgrade with compatibility option: `just unit src/graphs/base/GraphTransientState.part2.test.tsx -t 'figure batch shows each Preset as loading it would, and restores the entry scene' --maxWorkers=1` — passed.

The full unit and production smoke reruns pass after integration. Area-label screenshot parity is tracked separately in [the focused diagnosis](area-parity.md).

## Board infrastructure and upstream element names

The two objects lost during scene replacement were JSXGraph's hidden pointer-sketch curves. BaseGraph now preserves exact board.sketches and board.sketch references; they are disposed with their board. The lifecycle regression passes and fails when these preservation lines are removed. See [the investigation](compatibility-followup.md).

The upstream text to smartlabel/label rename required adapting both weight-label consumers in the smoke helper and text signatures in the real graph test harness. Visible numeric weights remain checked. Drawn-curve checks now measure substantive SVG path length, including the trigonometric midline stored as two points; collapsed paths still fail. Engineering review caught a missed boardWeights consumer, repaired before acceptance.

The original smoke run had 14 failures; the integrated rerun passed **243/243**. The final just check passed **192 test files / 3,687 tests**, typecheck, lint and production build. Initial unit timeouts passed when serialized; a later transient Vitest cache-file error cleared in the clean full run. Exact logs and mutation evidence are in [the audit](jsxgraph-upgrade.md).
