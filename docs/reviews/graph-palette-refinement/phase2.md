# Additional graph palette refinements

The owner requested a further search and release after the first palette commit. The first release was pushed to master as `6c0c6a28` before this search began at 2026-11-03 23:26:57 UTC. Scope and acceptance are in the [bounded spec](../../specs/graph-palette-refinement.md#second-release-selection).

## Selection and evidence

The current production build confirms the previously noted linear-map and Euler-method hierarchy issues at native card size and in actual lesson states: linear-map step 3/6 and Euler-method step 4/7 frame 1/2. The source and image grids compete with the mapped curve; the slope field competes with the approximation and exact solution. Their matched baseline is the frozen first-release production build on port 4328, rather than a reconstruction from old screenshots.

The assigned scan worker could not inspect the images or reach the preview with its attempted tools, so the handler completed the twelve-poster screen directly. [Scan coverage and limits](phase2-scan.md) preserves both results. Ear clipping was the one additional selection: its olive completed triangles and heavy ochre candidate closely repeat the owner's disliked region treatments. The handler inspected the real candidate at step 3/7 frame 2/3 and the completed triangulation at step 4/7 frame 1/3 before editing. No other graph was added.

| Demonstration | Final change |
| --- | --- |
| Linear map | Quiet cool source/image grids, stronger blue image handles, warm mapped curve and a clean light square fill. Source/image roles are separate from background-grid roles. Every grid line remains. |
| Euler method | Pale cool field, strong solid blue approximation/crosses and warm dashed exact reference. Field marks retain the same slopes, density and viewport sampling. |
| Ear clipping | Clean mint clipped triangles, pale warm candidate and quiet cool triangulation underlay. Borders/diagonals, rejected-candidate dash/cross, reflex markers, three-color shapes/letters and guard views are retained. |

[Native poster comparison](phase2-poster-comparison.png), [matched board comparison](phase2-board-comparison.png), [before manifest](phase2-before/scene-manifest.json), [after manifest](phase2-after/scene-manifest.json). The three scenes have identical control values, board text, all 21 visible SVG path geometries and 14 visible circle/ellipse positions. The candidate's [before](phase2-scan-ear-board.png) and [after](phase2-after/ear-candidate-board.png) show the pale warm fill at the same lesson frame. This is rendered geometry evidence for those scenes, supplemented by existing mathematical/host tests rather than an exhaustive proof.

Independent engineering/drawing review found no remaining actionable issue in either implementation slice. It checked actual geometry data paths, ownership/disposal, preserved layers and cues, legend agreement and Euler test selector non-vacuity. No formulas, algorithms, scene actions, presets, routes or localization keys changed. Relevant lesson prose and legend copy contain no newly false color descriptions.

## Verification and limits

- Focused linear/Euler model/host/lesson/field checks: nine files, 136 tests passed (`.command-logs/2026-11-03T23-33-03-414Z-40000-27acddbb.log`).
- Ear/geometry/lesson notation plus post-repair Euler host checks: six files, 59 tests passed (`.command-logs/2026-11-03T23-39-09-193Z-33828-367872ad.log`). No color-literal tests were added. Euler's existing host tests now identify the field via its existing viewport-generated marker and distinguish the finite polyline and dashed exact curve structurally.
- Media/lesson preview checks: three files, 16 tests passed (`.command-logs/2026-11-03T23-42-20-169Z-36796-942f87c1.log`). The first release's full checkpoint (10,299 passed, seven skipped) was not rerun for these local visual attributes; it also passed GitHub's full workflow before this second publication.
- Final TypeScript, scoped lint and production build passed. TypeScript caught a worker's `Math.max` applied to the thin-width callback; the handler preserved dynamic sizing with `() => Math.max(1, thin())`, then reran the affected host tests and final checks. Existing Sass/chunk-size warnings remain.
- Selective capture validated all 107 posters and refreshed these three IDs, with explicit provenance for retained assets. None has a motion entry. The production build was repackaged with the refreshed posters; a final capture confirmed all three PNGs byte-identical and recorded the served build. [Final build provenance](phase2-build-provenance.json).
- Independent initial rendered UI review passed all three routes at 1280×800; the worker's interrupted interaction artifacts remain explicitly unreviewed. The handler completed the selected stateful checks, 724px/390px keyboard/layout checks and actual exports, then confirmed all three catalog image bytes match the regenerated PNGs. [Independent coverage](phase2-browser.md); [handler completion](phase2-handler-browser.md).
- Accepted locally at 2026-11-03 23:51:27 UTC. The source, refreshed media and evidence are published together in the second palette commit. All three handler-owned previews were verified by command line and stopped; their ports have no listeners. The two remaining Playwright browser roots predate this task (local 10:10 and 18:49 on November 3) and were preserved.

Physical-device/projector evaluation, performance benchmarking and comprehensive assistive-technology testing remain outside this presentation-only task.

While strengthening second-release geometry evidence, the handler found that the first-release capture harness's point-class selector had returned empty arrays. Both first-release manifests were recollected from their retained builds with visible circle/ellipse coordinates and matched exactly (40 markers, plus the already matching controls/readouts). The first-release record now states the extraction's actual scope. This was an evidence-harness correction, with no application change.
