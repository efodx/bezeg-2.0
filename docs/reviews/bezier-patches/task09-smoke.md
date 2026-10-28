# Task 09 browser smoke (first pass)

- URL: http://127.0.0.1:4396/bezeg-2.0/patches/{decasteljau,derivatives,tensor}; production preview (`just preview 4396`).
- Revision: checkout 7447559 (only untracked .claude/scratch). The preview build revision was c1ecbf1 (dirty at build time) and was reused. Between the two commits 15 files changed, src/localization/sl.ts among them, so the build may be stale for that change.
- Browser: Playwright Chromium, SwiftShader software GL, 1440x1000 at deviceScaleFactor 2 (mobile 390x844). Fresh contexts, so no shared data was touched.
- Scratch and screenshots: .claude/scratch/smoke09/

## Checks

| # | Check | Status | Evidence |
|---|---|---|---|
| 1a | decasteljau order rows / columns / bilinear | Passed | The select lists the 3 orders. The construction points and lines changed (c-rows, c-cols, c-bil.png). Rows and columns show orange solid stage-1 lines, pink dashed stage-2 lines and larger pink hexagon/diamond markers. Bilinear shows orange only. The final point S(u,v) is hidden behind the surface in all three screenshots and only its label is visible, so I did not confirm it stays fixed. |
| 1b | u/v sliders | Passed | Set u=0.8 and v=0.3. The construction moved (c-uv.png) and the slider value read back as 0.8. |
| 1c | Reset | Passed | Changed the order and u, then clicked "Ponastavi prednastavitev". The state returned to the saved preset (columns, 0.8). Resetting to the default was not exercised. |
| 1d | Preset save, reload, restore | Passed | Save opens a name dialog. I saved "smoke09-test" with columns first and u=0.8. After reload the scene showed the default (rows, 0.35). Selecting the preset restored columns and 0.8. My delete click did not remove the preset in the script. The context was discarded, so nothing persists. |
| 1e | English | Passed | "Construction order / Rows first / Columns first / Bilinear" and the help text are in English. |
| 1f | 390x844 | Passed | scrollWidth 390 equals innerWidth 390. |
| 2a | derivatives default | Passed with remarks | S_u blue solid, S_v red solid, n black dashed, translucent blue plane with no visible z-fighting from two camera angles (d-a, d-b, d-nosurf). The twist is violet dotted with very thin, faint dots (d-nosurf.png). At default it points down and is hidden under the surface, and the S_uv label shows only when the surface is hidden. |
| 2b | Labels | Passed with remarks | Readable at default. After an orbit, n overlapped S(u,v) and S_u sat close to the S label (t-derivatives-orbit.png). |
| 2c | Corner buttons and readout | Passed | The readout sits under the buttons. Corner (0,0): S_uv (0;0;22,5). Corner (1,0): S_uv (0;0;-22,5). Decimal commas are used (2,047; -0,525). English uses decimal points. |
| 2d | Prikaz toggles | Passed | 7 checkboxes. Turning off plane, normal and twist removed them (d-allhidden.png: only S_u and S_v remain). Turning them back on restored them (d-restored.png). |
| 2e | Collapsed edge and parallel edge vectors | Passed (message); plane absence not confirmed visually | Collapsed edge: S_v is the zero vector, n reads "ni določena" and the explanatory message is shown. Parallel edges: S_u parallel S_v, same status. I did not screenshot the absence of the plane. |
| 2f | English and 390x844 | Passed | The English readout is correct. scrollWidth is 390. |
| 3 | tensor retained | Passed | Loads. Dragging a control point showed P22 moving (t-tensor-cp-drag.png), orbit worked, 0 errors. |
| 4 | Timing | Passed | See below. |

## Timing (software GL; 40 moves 8 ms apart, 1440x1000, defaults, one run per route)

| Route | Drag next-rAF med / p95 (ms) | Drag frame p95 (ms) | Orbit next-rAF med / p95 (ms) | Orbit frame p95 (ms) |
|---|---|---|---|---|
| decasteljau | 5.7 / 8.1 | 33.4 | 3.8 / 5.1 | 16.8 |
| derivatives | 5.8 / 9.3 | 33.4 | 3.8 / 5.7 | 16.8 |
| tensor | 5.8 / 8.0 | 33.3 | 3.8 / 5.2 | 16.8 |

The drag p95 and the active frame p95 are within budget. The orbit next-rAF p95 is 5.1-5.7 ms, under the 16.7 ms budget. The orbit active frame p95 is 16.8 ms, which is vsync. I read the 16.7 ms budget as the next-rAF figure. Software GL is not representative of real hardware.

## Console

All three routes: 0 errors. Only SwiftShader "GPU stall due to ReadPixels" warnings.

## Cleanup

No source files were edited. The temporary preset lived only in discarded browser contexts. The preview (PID 13968, port 4396) is stopped as the last step.

## Handler follow-up

Build provenance: the reused build came from the handler's `just check`, run after the last source edit; its sources equal `7447559`, so the localization change was included. The twist retune and the export/keyboard check are recorded in [construction-derivatives.md](construction-derivatives.md#smoke-and-handler-browser-checks).
