# Task 06 slice 3 (worker note): overview fan

Done: src/workspace/preview/fan.ts (FAN_REST_MS 300, fanValues over the sweep window, fanWithNear), controller `showFan` + Ghost.near, GhostOverlay classes is-fan/is-near, ghost.css, previewContext `showFan`, RangePuck body rest timer (mouse only, restarts when leaving the track back onto the body, cleared on press/leave/value change/sweep start/lock), CountPuck help line (`puck_count_preview_hint`, sl/en, only when previewable). Tests: src/workspace/preview/fan.test.tsx (9). Red: 06-fan-red.log (module missing); run1/run2 logs show fix iterations. Green: `just unit src/workspace` passed, tsc 0, lint passed. Browser: 06-fan-browser.cjs/.log/.png.

Gap: `phase-a` declares no `help`, so the fan shows no help card there (and the count line needs a count with help). Declaring help is in src/graphs (not owned).
