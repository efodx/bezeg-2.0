# Sweep task 17 acceptance: monotone triangulation graph

Accepted 2026-11-02 by geometry handler 35. Task: [17](../../tasks/sweep-algorithms/17-monotone-triangulation-graph.md). Worker report: [17-handoff.md](17-handoff.md).

## Reviews (Sonnet `bezeg-reviewer`, in parallel)

- **Engineering:** accept. Task-16 hooks (`partitionRunOf`, `buildRun`, `sweepControls`, exported helpers, Preset-collection `key`) are pure refactors and task-16 tests pass. `drawOverlay` returns every object, so disposal follows the parent lifecycle; the host test covers unmount, listeners and frames. Edit and Reset reset to step 0 and pause; Next and Play match across the phase boundary. Nit kept: the subclass's `triMemo` sits beside the parent's `runMemo` (Preset path and drawing path).
- **Mathematical:** accept. The handler asked the reviewer to check the triangle-from-event derivation ("each `status-remove` after the first in a vertex group closes one triangle"). The reviewer checked it against every kernel branch (last vertex, opposite chain, same chain, blocked test) and judged it exact. The mismatch guard throws only on real divergence. Stacks equal the kernel's (`EXAMPLE_1_STACKS`); there is no dead step at boundary 14 of 44. Counts are 11 against 21. The y-monotone Preset is simple, counter-clockwise and strictly monotone on both chains. Nits:
  - The app's ear-clipping kernel rescans after each clip, so its worst case is \(O(n^3)\). The panel keeps the spec's textbook statement, \(O(n^2)\) against \(O(n\log n)\).
  - A tie-heavy polygon (a horizontal edge) is not in the run test. That belongs to the kernel's task 15 tests.
- **UI/accessibility (code level):** accept.
  - Should-fix 1 was rejected: Bootstrap 5, imported globally, defines `.visually-hidden`.
  - Should-fix 2 is kept as is: the live region mounts together with its first content. It is the same pattern as task 16 and the other sweep controls; a change belongs to a cross-cutting pass, not this task.
  - Nit applied: `monotonetri_note_blocked` (sl) now reads "zato sklada ne krajšamo več".
  - Nit left for the route smoke (task 18): chain labels may crowd on dense pieces.

## Handler checks (revision `3ad0b8a5` plus the sweep 17 diff)

- `just unit src/graphs/compgeo`: 41 files, 569 tests passed, 1 skipped.
- `npx tsc --noEmit --pretty false`: clean. `npx eslint src/graphs/compgeo src/localization`: clean.
- The worker ran `just build` and 8 mutations. No smoke: there is no route until task 18.
