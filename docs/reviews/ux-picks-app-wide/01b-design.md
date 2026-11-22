# Task 01b view adapter: design (handler, 2026-11-22)

Inputs: [task 01b](../../tasks/ux-picks-app-wide/01b-view-adapter.md), [view sites](view-sites.md) (75 `setBoundingBox(` calls in 49 non-test files, two zoom calls), the task 01 arbiter (`src/graphs/base/writes/`).

## Shape

- **One adapter per mounted board**, owned by `GraphSession` next to the board it wraps (secondary boards such as the PH hodograph get their own adapter from the session that creates them). Disposed with the session.
- **Intent** is the board's view as the graph, the lesson, Reset, a Preset or the learner's pan and zoom last asked for it. **Fitted** is the view a fit shows (task 07); until a fit exists the shown view is the intent.
- **The intent is a bound key of the graph's arbiter**, `view` (a secondary board: `view:<board>`), with `read` = the adapter's intent and `apply` = `setIntent`. Every board gets an adapter in 01b, but only a graph that already has an arbiter (the five pilots of task 01) binds its view; every graph binds in task 08, like its parameters (handler, 2026-11-22: binding all graphs now would make every unmoved view sync that runs after a host commit an untagged write in development). The arbiter's rules apply unchanged: a learner pan ends a fit's lease on `view`, a lesson cannot move a view the learner is holding, and an intent change outside a write source fails the development check.
- `setIntent(box, options)`: stores the intent and applies it to the board (keep-aspect per call, as today), tagged by the current write source (no source parameter: the scope says who writes). It is the only caller of `board.setBoundingBox` and `zoomIn`/`zoomOut`.
- `setFitted(box, lease)` (for task 07): applies a box without changing the intent; refused unless the lease on `view` is active.
- **Learner pan and zoom by gesture**: the adapter listens to the board's `boundingbox` event. A change it did not make itself becomes the new intent; the arbiter attributes it to the current source, which is the learner's gesture for wheel, drag-pan and keyboard navigation (window input tagging from task 01). Outside any source it is an untagged write and throws in development.
- **Resize is not a write**: the session's resize handling runs inside `adapter.resizing(() => ...)`; a box change there keeps the intent (it is re-applied to the new aspect) and is not attributed.
- **Mount**: views set while the graph is not yet ready (`initialize` during mount) set the intent without attribution, like the arbiter's baseline at bind time.
- **Presets store the intent** (`exportPreset` reads the adapter, not `board.getBoundingBox()`); a stored box loads as an intent, so existing Presets are unchanged.

## Sources by class (from the table)

| Class | Source | How |
| --- | --- | --- |
| initial (10) | none (mount) | before ready: baseline, not attributed |
| follows-parameter (33) | the write's own | inside the setter's scope (learner input, lesson action) |
| reset (1), preset (4) | `learner` | already inside the `learner` scene replacement (task 01) |
| lesson (4) | `lesson` | already inside lesson scopes |
| fit (12) | `learner` (fit button, refit-when-outside during an edit) | the button is a learner input; a refit inside an edit takes the edit's source |
| resize (6) | not a write | inside `adapter.resizing` |
| export (1) | `learner` | figure export is a learner command (scene replacement source) |
| other: zoom/pan buttons (3) | `learner` | input events |
| other: test-support helpers (3) | test's choice | the helper names its source |

## Settled while moving the sites (handler, 2026-11-22)

- `following(work)`: a view derived from scene state in a post-commit sync (`syncBoard`, `applyFrame`, `applyView`) is not a write, like a resize. Also used for the derived frame of `syncReplacedScene` in `WavesGraph` and `KinematicsGraph` when the replacement brought no stored view (reviewer finding: a Preset path). Task 08 re-checks each `following` site of a graph it binds: a view the lesson, Reset or a Preset asks for must stay a plain `setIntent` inside that writer's scope.
- `setIntent(box, {zoom})` passes JSXGraph's `setZoom` mode for one call (the fit keeps `'update'`).
- Secondary boards: `createAuxiliaryBoard` returns the board's `view` (disposed by `release`); the surface view's pixel-frame board has its own adapter. None is bound until task 08.
- The main board's adapter is `BaseGraph.boardView` (many graphs already have a `view` member).

## Slices

1. Adapter core and its tests (handler design, worker tests): pure intent/fitted state over a minimal board interface (`setBoundingBox`, `getBoundingBox`, `on/off('boundingbox')`), so it is testable without JSXGraph.
2. Session wiring: `GraphSession` creates the adapter for its board; resize inside `resizing`; BaseGraph binds `view`; `exportPreset` reads the intent; `BaseGraph` sites (initial view, reload, fit, zoom and pan buttons, lesson view, export) moved.
3. Sites moved by family in worker batches with one shared brief and a worked example (BaseGraph's), the all-graph suites as the gate.
4. Acceptance tests from the task file; contact sheets of the pilots before and after (`just shot --sheet`), judged by `bezeg-visual`.
