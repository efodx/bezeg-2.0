# Phase 2 browser smoke

## Run details

- Preview: `http://127.0.0.1:4327/bezeg-2.0/` (handler-owned local production preview; three selected routes returned HTTP 200).
- Source: `6c0c6a28`, with the handler's dirty second-release graph changes and review/media files present. The handler reported a successful production build and asset repackaging.
- Browser: installed Playwright headless Chromium; exact browser version was not recorded. Initial route captures used 1280×800 in a fresh browser context.
- Initial route captures completed within the assigned six-minute budget; report/cleanup closeout overran it. A later control/export script was interrupted by the handler after 6.3 seconds of that tool invocation; its output was not returned. The handler's recorded dispatch boundary was 23:40:19 UTC, and final integration/cleanup completed at 23:51:27 UTC.
- Initial route visits logged no page errors or console errors. Browser contexts were isolated; no preset was saved.

## Selected checks

| Check | Status | Evidence |
| --- | --- | --- |
| Linear map route and initial presentation | Passed | Route returned 200. At 1280×800, the identity scene showed the light blue grid, unit-square boundary, mapped curve/handles, basis labels, matrix inputs and legend. Initial readout showed identity matrix and images `(1, 0)`, `(0, 1)`, and `(1, 1)`. Capture: `phase2-smoke-browser-worker-linear-desktop.png`. |
| Euler route and initial readouts | Passed | Route returned 200. At 1280×800, visible slope marks were pale blue, the Euler approximation was solid blue, and the exact solution was warm dashed. Initial `y' = y`, `h = 0.5` readout showed approximate `y(1) = 2.25`, exact `2.7183`, and absolute error `0.4683`; the exact solution checkbox was checked. Capture: `phase2-smoke-browser-worker-euler-desktop.png`. |
| Ear-clipping route and initial controls | Passed | Route returned 200. The default five-point polygon and editor were visible; the trace showed step 1 of 12 with Next, Play, and Reset controls. Capture: `phase2-smoke-browser-worker-ear-desktop.png`. |
| Reversed and singular linear-map examples; matrix edit | Skipped | The first interaction script used an incorrect select index and stopped before changing state. A subsequent scripted attempt left `linear-reverse.png` and `linear-singular.png` captures, but its stdout/readouts were lost at interruption. These files are unreviewed and do not establish determinant values or a successful edit. |
| Euler step keyboard change, exact toggle, equation choice, node edit, and SL/EN/SL state retention | Skipped | A later script left `euler-edited.png`, but returned no observations after interruption. No behavioral result is claimed. |
| Completed ear trace, triangulation/toggle and active candidate marks | Skipped | A later script left `ear-complete.png`, but returned no completion readout or reviewed visual evidence. Initial route evidence only establishes the starting scene and controls. |
| Actual SVG/PNG export inspection | Skipped | The interrupted run left `phase2-smoke-browser-worker-export.svg` (63,900 bytes) and `.png` (124,483 bytes). Download files exist, but format signatures, dimensions, contents, and palette were not inspected; this does not satisfy the export inspection check. |
| 724px/390px layouts and keyboard reachability | Skipped | Not exercised. |
| Refreshed native demonstration cards | Skipped | Not checked in this run. |

## Evidence and limits

The three initial desktop screenshots and browser logs are reviewed. The later state and export files are unreviewed because the handler interrupted that script; the handler retained them under ignored `.command-logs/palette-phase2-unreviewed/`, outside published review evidence. They do not close the stateful interaction or export-inspection gaps in this independent run. The handler reports that a separate followup completed those checks with assertions and no page errors; its log and captures are recorded separately as `.command-logs/palette-phase2-closeout.json` and `phase2-closeout-*`. No physical-device, accessibility, performance, or hosting claims are made.

Initial scripts closed their Chromium instances in `finally`. The interrupted script returned no PID/session identifier. Process inspection via `Get-CimInstance Win32_Process` was denied, so I could not confirm whether that process exited and did not terminate any process. The handler-owned preview on port 4327 was left running.

Handler closeout: outside-sandbox process inspection found two remaining Playwright browser roots whose parent scripts started before this task; those were preserved. The handler verified and stopped its three owned previews on 4326/4327/4328 and confirmed no listeners remained on those ports. See the separate handler report for passing stateful/export checks.
