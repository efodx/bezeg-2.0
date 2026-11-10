# Step 6 rollout slice brief (s6b): every playback route uses the slot

Read `w3-common-brief.md` first, then `w3-s6-impl-brief.md` (the core contract) and `w3-s6a.md` (what s6a built, review notes). Slice id: `s6b`. Source: [graph-adjacent controls](../../../tasks/mobile-graph-playback/graph-adjacent-controls.md) item 3; spec `docs/specs/mobile-graph-playback.md` (layout decision and acceptance). Route list: the *Routes* table in `docs/tasks/mobile-graph-playback/graph-adjacent-controls.inventory.md` (34 rows, hosts with `file:line`).

## Work

1. For every inventoried playback route, its one primary playback group passes `placement="graph"`. Most use `PlaybackButtons` already (Wave 3 P1/P2 moved continuous runs onto it); find any group still own-built (grep `inspector-playback` and `data-action="play-pause"` outside `PlaybackButtons.tsx`) and either move it onto `PlaybackButtons` or report why not.
2. **Several groups (Voronoi and any other):** the graph picks one primary group (the one with Next step/Play for its run); the others stay in the inspector. Record the choice per graph in `w3-s6b.md`.
3. **Live parameter controls (decision: variant B per route):** De Casteljau keeps its `t` and speed sliders in the inspector for this slice; record any route whose motion needs a live control beside the graph as a proposal, do not build the disclosure yet.
4. **Focus across the breakpoint:** when the group moves between inspector and slot while a button inside it has focus, focus moves to the same `data-action` button in the new location (one test with the media hook flipped).
5. Learning playgrounds (collision run and inspect) and lesson hosts: they render outside `DemonstrationWorkspace`'s slot; leave them inline and list them.

## Owned paths

Graph files and controls named in the inventory's host column, `src/graphs/base/controls/PlaybackButtons.tsx` (focus item only), their tests. Not `DemonstrationWorkspace.*` (report a needed change).

## Checks

`just unit` for each touched directory, `just typecheck`, `just lint` on touched files; one host test per family (iterative function, trace, continuous curve) that the group claims the slot when the media hook is true; for each new assertion an observed failure in `w3-s6b.md`.

## Return

≤300 words: routes switched (count), routes left inline with reason, primary-group choices, checks and observed failures. Bulky lists to `w3-s6b.md`. On `HANDOFF`, write done/remaining there and stop.
