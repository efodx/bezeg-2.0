# Handoff: Fourier 06 F2a Part H (partial)

## Done (written, `npx tsc --noEmit` clean after the model.ts edit; nothing else verified)
- `src/graphs/functions/EpicycleGraph.tsx` (+ `EpicycleGraph.css`): fixed board set (5 curves + pool of 8 vertex and 16 control handles), caches (analysis/loop per loop+parametrization, trace/error per N), host state (time, playing, rejection) outside the model via a subscribe/snapshot store, injected `AnimationScheduler`, inspector (example, N slider and +-10, cap hint, parametrization, fallback hint, play and time, handle fields), status live region, 101-row table, legend, lesson actions.
- `src/graphs/functions/epicycleMessages.ts` (issue and file messages).
- `functionPresetCollections.ts`: exported `epicyclePresetCollection` (not in the Demonstration map; no route).
- `sl.ts`/`en.ts`: `epicycle_*` keys and `invalid_epicycle_data`, in lockstep.
- `src/learning/model.ts`: added `epicycle-example`, `epicycle-parametrization` choices and 50 `epicycle-*` parameter names (needed for typed lesson actions in the host test).
- `src/graphs/functions/EpicycleGraph.host.test.tsx`: 13 tests written.

## Unfinished, in order
1. Run `just unit src/graphs/functions/EpicycleGraph` (started, result unseen; logs in `C:/Users/1337Hacker/.claude/jobs/cb986187/tmp/fourier-f2a/h-host1.log`) and fix failures; expect some test-side issues (handle labels, jsdom `visPropCalc`, `board.objectsList` length 0 after unmount, drag via `triggerEventHandlers`).
2. Mutations: none run yet for Part H (need at least 3, e.g. drop `halt()` in `accepted`, make circle count depend on N, remove cache identity check, drop `resetTime` in import).
3. `just unit src/analysis src/graphs/functions src/localization src/learning`, eslint on touched files, final tsc; logs to the directory above.
4. Not checked: the model.ts name additions against learning content tests.

## Decisions / flags
- Circle = 48 segments, 49 coordinates (closed polygon). Rows include k=0 (101 at N=50). "Largest term" = largest |c_k| over k != 0 (centre if N=0). Coordinates in labels are 0-based.
- Keyboard path for handles = inspector number fields (named labels), not board focus.
- Lesson time `epicycle-time` rejects values outside [0, 2pi). Slider max 6,28.
- Terms: krajišče (end point, matches the 39 existing Bezier uses), kontrolna točka, sklenjena krivulja, parametrizacija "Enakomerna" / "Po dolžini tetiv", epicikel/"vrteči se krogi" per terms research.
- No contradiction with spec/ADR found; ADR "48 points" read as segments.
