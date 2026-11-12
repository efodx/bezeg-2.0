# 03 Release batches A–C (F2b done; split into tasks 04–06)

Gate: Controls step 7 `accepted` in [controls.md](../feature-streams/controls.md) — open. Split on 2026-11-12 (handler 10) into [04 Batch A](04-batch-a-lessons.md) (L1–L2), [05 Batch B](05-batch-b-lessons.md) (L3–L4) and [06 Batch C](06-batch-c-lessons.md) (L5).

The batches are A (L1–L2), B (L3–L4) and C (L5). Each runs F2b registration, F3 scenes and [one-shot lesson text](../../specs/new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31), F4 chapter, F5 media and F6 acceptance, per the [family template](../feature-streams/README.md#family-template).

Owed from task 02: F2b registration restores Presets through the parser and serializer in `src/graphs/lines/lineGeometryModel.ts`. Batch A F2b also owes the browser drag measurement of the line graph per [the performance plan's measurement protocol](../../performance-plan.md); task 02 recorded only a jsdom placeholder (median 2.6 ms).

F2b done 2026-11-11 (route `/line-geometry`; Presets through the model parser; [evidence](../../reviews/feature-streams/families-prep/notes/f2b-lines-isometries.md)). First F3 item, handler 7 decision 2026-11-11: shrink the fixed view from \([-17,17]^2\) to \([-10,10]^2\). At the route the default scene filled a few units of a board about 67 units wide ([diagnosis](../../reviews/feature-streams/families-prep/notes/f2b-initial-view.md)), against the guardrail that the graph stays prominent. Keep the view fixed (no refit under the pointer); a foot or intersection outside it is not drawn and the status says so, as the spec already provides. Rejected: a refitting view (jumps while dragging) and keeping ±17 with larger markers (the construction stays small). Update the spec's graph-view bullet and the view test with it.

Done 2026-11-11 (F3): `VIEW_HALF = 10` in `LineGeometryGraph.tsx`; spec bullet and view test updated.

Batch A drag measurement done 2026-11-11 (desktop and 390×844 at 4× CPU, no budget miss): [results](../../bezier-performance-results.md#f2b-geometry-routes-drag-baseline--2026-11-11).
