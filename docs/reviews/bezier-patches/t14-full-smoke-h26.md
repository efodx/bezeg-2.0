# Task 14 integrated manual smoke — 2026-10-29

Target: production preview `http://127.0.0.1:4396/bezeg-2.0`, source `e917d2c` dirty; app/workspace/lesson source unchanged after 18:39:51 refresh.

| Area | Result |
|---|---|
| Legacy curve drag; De Casteljau slider; rational weight; C1/PH render; picker navigation twice | Pass; PH keyboard control changed w1.y 1.7→1.8 and length 10.333→10.393. |
| PH draggable point | Gap: two attempted drags showed no visible movement; retry target/interaction. |
| Six patch routes; triangular camera top/reset/front; lesson cancel/exit restoring u=.34 + Front | Pass; route/render and edited-scene restoration observed. |
| Triangle preset save/default-reset/reload/delete | Pass; isolated preset restored u=.34 and camera az/el 0/0, then deleted. |
| Tensor preset, valid/malformed JSON import, preset export, PNG/SVG export inspection | Not run: browser checks stopped at handler request. |
| Catalog motion/assets; physical touch | Not verified; catalog assets pending, emulation is not hardware. Handler owns automated suite and 11 lesson walks. |

Scratch observations: `.claude/scratch/patch-full-smoke-h26/observations.md`. Existing lesson evidence: `docs/reviews/bezier-patches/t13-interactions-smoke-h26.md`.

Handler closure: remaining tensor/import/export/touch coverage passed in t14-persistence-exports-h26.md. The stabilized complete automated suite passed273/273, including51 catalog clips and22 patch walks; CI40936771299/deploy and hosted checks passed. PH drag itself remains unconfirmed in this manual slice; required PH generator controls responded to keyboard editing and automated lifecycle/ownership checks passed. No physical hardware claim.
