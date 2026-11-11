# Decision 57 gaps: De Casteljau run (open item)

Source: `DecasteljauGraph.tsx` and `DecasteljauGraph2.tsx` (both `refreshWorkspace` overrides, before `mount`).
Tests: `pauses a run (decision 57)` blocks in `DecasteljauGraph.test.ts` and `DecasteljauGraph2.test.ts`.
Logs: `.command-logs/oi-decast-before.txt` (2 failed, 34 passed), `oi-decast-after.txt`, `oi-decast-tsc.txt`.

| Path | Before | After |
| --- | --- | --- |
| Applied curve command in the Edit tab (elevate, reverse, ... via `CurveWorkspaceOperations` `onChanged`), subdivision that adds a curve, point edits | run kept playing (only typed point edit/removal paused) | `refreshWorkspace()` pauses the run |
| Preset load / scene replacement | already ended: `restoreTransientState` stops the driver and `statusAfterSceneReplacement` leaves no `playing`; new test passes before and after (could not be observed failing, it documents existing behaviour) | unchanged |
| Operation previews, sliders, display toggles (`CurveDisplayControls`, full curve) | no pause | no pause (they do not call `refreshWorkspace`) |

Not covered: the legacy selected-curve panel (`getSelectedCurveCommands`, `onChanged` = `store.notify`) cannot tell an applied operation from a preview, and lives in `BaseCurveGraph` (outside this slice). The Edit tab is the path De Casteljau uses.
- Handler note: `CurveEditingFeature.ts:135` also refreshes after a board pointer-down in Add-points/Delete-points mode that edits nothing, so such a click pauses a run too. Accepted as minor; Move mode returns early and does not pause.
