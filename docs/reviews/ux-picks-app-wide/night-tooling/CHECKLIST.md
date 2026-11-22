# Probe checklist (thresholds for `out/<slug>.json`)

Each size lives under `sizes["1440x900"]` / `sizes["1024x768"]`. `verdict[]` in the JSON already lists every breach (`size, metric, value, threshold`); this file says what each metric means. Scenario names are the keys of `scenarios`.

| Metric (JSON path) | Pass | How to read it |
|---|---|---|
| `pageErrors`, `consoleErrors` | both empty | Page error "Unexpected token '<'" is already removed. HTTP 4xx/5xx responses are appended to `consoleErrors` with their URL. |
| `scenarios.*.frame.p95` | <= 20 ms (throttle 4: <= 40) | rAF gap during the scenario. 16.7 = 60 fps. `gt33`, `gt50` count dropped frames. |
| `scenarios.*.frame.max` | <= 50 ms (throttle 4: <= 100, own addition: 4x slowdown makes 50 ms unreachable) | One long hitch is visible as a stutter. |
| `scenarios.*.longTasks.over50` | 0 at throttle 1 (not enforced at throttle 4) | Main-thread tasks over 50 ms during the interaction. |
| `scenarios.*.cls` | <= 0.02 | Sum of layout-shift entries without recent input. Above = something moved by itself. |
| `scenarios.puckHover/toolsSliderHover.flickerCount` | 0 | Sampled text (puck value, readout rows, hover card, tape) or ghost/fan presence went A,B,A within 150 ms while the pointer moved one way. `flickerEvents` has timestamps and texts. |
| `scenarios.countHoverStationary.flickerCount` | 0 | Pointer still on the count +; any change after the first 200 ms. |
| `scenarios.*.widthDrift[puck]` | <= 1 px | max-min of that puck's width across the scenario (puckDrag, sweep, puckHover, toolsSliderHover). Drift = the puck resizes under the finger. |
| `viewMotions[].jump` (and `scenarios.viewOnLoadAndPuckRelease.*`) | false | One 50 ms sample moved the view box > 15 % of its width with no intermediate sample: a cut, not a glide. |
| `viewMotions[].glides` | <= 1 | Separate motion segments (a pause of >= 100 ms ends a segment). 2 = double motion (move, stop, move). |
| `viewMotions[].settleMs` | <= 900 | From the end of the action (click or drag release) to the last change of the view box. |
| `viewMotions[].backReturnPct` | <= 2 | After Back the box must return to the box that step showed on the way forward (settled box after its Next; step 0 = before the first Next), within 2 % of width. Fixed by handler 9 (it compared with the box just before the Back click). Mechanically a step that should be still cannot be known; `still: true` is listed for the reviewer to judge. |
| `scenarios.lessonWalk.reloadDriftPct` | <= 2 | Box after reload vs first visit, % of width. |
| `cover.*.coverPct` | <= 35 (own addition, guideline only) | Share of the board area under dock cards, pucks or the lesson card at load and after each step (`stepN`, `stepNb` after Back). Report values > 50 as a finding even if the guideline is loose. |
| `mustPoints` | 0 under cards | Reads `"not exposed"`: `viewDirector.setMarks` keeps marks private (`src/uxPicks/declare/viewDirector.ts:169`), `director.state()` omits them. Not measurable without a repo change. |

Skipped scenarios (`skipped: "..."`) are not failures; list them in the report. `error` in a scenario is a probe failure: rerun once after 5 s (hot reload), then report it.
Note: with all picks on, the tools-panel sliders are hidden (pucked), so `sliderDrag` and `toolsSliderHover` skip. Run with `--ux a3,boardText,b1,toolsCard,viewDirector` (no a1) to exercise them.
