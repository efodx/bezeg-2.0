# T3 task 22 and 24a acceptance (Voronoi lesson B4 and its chapter section)

Accepted 2026-11-03 by geometry handler 39. Tasks: [22](../../tasks/triangulation-voronoi/22-voronoi-lesson.md), the `voronoi` half of [24](../../tasks/triangulation-voronoi/24-t3-chapter.md). Workers: `bezeg-worker` (Sonnet) 22 ([brief](22-brief.md), stopped at budget, [handoff](22-handoff.md)) and 22b ([brief](22b-brief.md)), worktree `agent-ab6e252dd83a77fd9`. Integrated by the handler onto `6754e336` (after sweep 21).

- **Integration:** four mechanical conflicts with sweep 21 and the Curves/Functions streams: the plural helper (both sides wrote the same one, so one copy is kept), the audited-home count (103 → 106 = sweep +2, voronoi +1), `CHAPTER_LINK_PENDING` and the lessonless list (master's ids kept, `voronoi` removed). Mixed line endings were checked; none remained.
- **Mathematics** (handler): for seven sites with five on the hull, Euler gives \(2n-2-h=7\) triangles, so 7 Voronoi vertices, and \(3n-3-h=13\) edges, which is 8 finite edges plus 5 rays. The circumcentre of \(P_1=(0,0)\), \(P_2=(8,0)\), \(P_6=(3,3)\) lies on \(x=4\), and \(16+y^2=1+(3-y)^2\) gives \(y=-1\). No other site lies within \(\sqrt{17}\) (the nearest is \(P_7\) at \(\sqrt{20}\)). The lesson test asserts every quoted value against the kernel and the panel readout.
- **Engineering review** (Sonnet `bezeg-reviewer`): no blocking findings. Its notes and their dispositions:
  - Old `compgeo-voronoi` Presets without `diagram` show the diagram, through `overlayShown`'s initial-state default. Covered by host tests for both Voronoi graphs.
  - The worker's claim that new files store `diagram` only when off is **wrong**. A fresh export writes `overlays.diagram: true`, and an older build rejects the unknown key (`pointset_invalid_overlays`). This is forward-only: files from older builds still import. It is recorded in the task file and is not a breaking change under AGENTS.md, because stored Presets and routes valid before keep working.
  - The `PointSetGraphState.overlays` comment ("an absent id is hidden") was stale. Fixed.
- **Bug found by the handler:** the worker's `voronoi` smoke row had literal backspace characters in its regex (`/\x087\x08/` instead of `/\b7\b/`), so the readout check could never match. The worker had only syntax-checked it. Lint caught it; fixed.
- **Bug fixed by 22b:** `'delaunay'` was missing from `POINT_SET_OVERLAY_NAMES`, so every `set-overlay delaunay` action failed.
- **Mutations:** seven observed failures in [22b-mutation.log](22b-mutation.log): lesson numbers, spoiler hiding, action rejection, ownership, overlay compatibility, the B3 forward link and `set-construction`.
- **Checks (handler, `65fbad83` + diff):** [`just typecheck`](22h-tsc.log), `just lint` (after the two fixes), full `just unit` passed in 785 s ([log](22h-unit.log)), [`just build`](22h-build.log). [`just smoke-lesson voronoi`](22h-smoke.log) passed 2/2 (sl pointer walk, en 390×844).
- **Browser** (Sonnet `bezeg-smoke`, preview 4313, [scripts and screenshots](22h-browser/)):
  - A live language switch at step 4 keeps the step, frame, readout and selection.
  - Keyboard-only walk: all 7 steps, 14 advances.
  - Spoiler: no counts in steps 1–2.
  - Chapter `#voronoi`, sl and en: activity link → lesson → return link lands on `#voronoi`, with focus on the example link. The Delaunay section names the next section.
  - Preset import: an exported Preset with `diagram` removed restores with the diagram shown.
- **Notes, not from this diff (shared lesson runtime and shell):**
  - After each keyboard advance, focus moves to the lesson section, so reaching Next takes 5–29 Tabs.
  - `document.activeElement` became `body` twice in the Tab loops; not diagnosed.
  - One shell element labelled "Za uporabo Bezega omogoči" has no focus ring.
- **Gaps:** Chromium only; touch not tested.
