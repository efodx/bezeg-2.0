# 06 — Lifecycle

Status: proposed. Source: [criterion 6](../../specs/jsxgraph-surface-view.md#acceptance-criteria).

Idempotent `dispose()` frees the board, listeners, observer and frames; dispose during a pending `attach` leaves nothing behind. Add an instrumented test over three remounts asserting that board, listener (host, window, document) and observer counts return to baseline. This is the prototype's failure.
