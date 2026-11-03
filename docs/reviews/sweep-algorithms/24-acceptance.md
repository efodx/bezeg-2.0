# Task 24 (Fortune registration): acceptance

Accepted 2026-11-03 by geometry handler 45. Source: [task 24](../../tasks/sweep-algorithms/24-fortune-registration.md). Brief: [24-brief.md](24-brief.md). Implemented by one `bezeg-worker` (Sonnet, effort high, about 104k tokens, returned complete); smoke by one `bezeg-smoke` worker (returned partial at its budget, closed by the handler).

## Scope items

1. **Registration.**
   - `fortune` is at `/bezeg-2.0/compgeo/fortune`, in the computational-geometry family after `monotone-triangulation`, with `lesson: false` until task 25.
   - The factory is in `graphFactories.ts`. `fortuneCollection` joins `compgeoPresetCollections`, the accepted keys in `PresetCatalog.test.tsx`, and `PRESET_DATA_STATE_KEYS`.
   - Title *Fortunov algoritem* / *Fortune's algorithm*, and two prompts (false alarm, Delaunay dual) in SL/EN.
   - `fortune` is in `POSTER_PENDING`, with a recipe in `scripts/demonstration-preview-recipes.cjs` (4 × Naslednji korak, the false-alarm frame). It is also in `CHAPTER_LINK_PENDING` and in the no-lesson list.
   - Totals: 101 Demonstrations, 13 in the family.
   - New `fortunePresetCollection.test.ts`, run through the registered importer: 12 sites accepted and 13 refused with a message, coordinate 1024 accepted and 1025 refused, polygon mode refused.
2. **Default view.** `FortuneGraph.initialView()` already framed the example. `compgeoDefaultView.host.test.tsx` gains the `fortune` row (margin) and a test that the units are equal and the step-0 sweep line lies above the highest site and inside the view.
3. **Smoke.** [24-smoke.md](24-smoke.md), with the handler follow-up: route direct and after reload at 1280×720 and 390×844, language switch SL→EN→SL keeping the step, Preset save/reload/restore, Reset and Reset preset, and the catalog card. `just smoke-built` passed (486.8 s, `24-h-smoke-built.log`).

## Carried from task 23

- **Browser check of the Fortune graph at both viewports:**
  - the readouts update;
  - the queue shows the cancelled entry at the false alarm;
  - the sweep-height line is typeset (MathJax, no raw TeX);
  - the live region is `aria-live="polite"` and visually hidden;
  - no overflow at 390 px.
- **Global `.visually-hidden`:** on `/compgeo/monotone-partition` and `/compgeo/segment-intersections`, hidden elements are clipped to 1×1 px, and the step counter, status list and readouts stay visible.
- **Perf rerun on the registered route:** appended to [23-perf.md](23-perf.md#rerun-on-the-registered-route-task-24-handler-45). Median 16.7 ms, p95 16.8 ms, max 16.8 ms; the beach line stays one board object.

## Review (engineering, in the main chat; 52-line diff)

The diff follows the task 18 file list. The prompts are mathematically sound: D splits the arc of A, so \((B,A,C)\) stops being consecutive and that arc does not vanish at \(y=-5\). An executed vertex's empty circumcircle is the Delaunay triangle. The recipe's "step 5" is the 1-based step counter after four presses. No defects.

## Checks

| Check | Result |
| --- | --- |
| `npx tsc --noEmit --pretty false` (worker) | 0 errors |
| `just lint` on touched paths (worker) | passed |
| full `just unit` (worker) | 538 files passed, 2 skipped; 10520 tests passed, 3 skipped |
| `just build` (worker, then handler) | passed |
| `just smoke-built` (handler) | passed |
| Mutations (worker): `initialView` changed; step-0 line at `minY`; collection unregistered; site limit 13; coordinate limit doubled | 2 / 1 / 4 / 1 / 1 failures, each reverted |

Not done: poster capture (F5, `POSTER_PENDING`); `LINE_DEFINED_IDS` in the recipes script is to be decided at capture.

Impact: new route only; existing routes and stored Presets are unchanged.
