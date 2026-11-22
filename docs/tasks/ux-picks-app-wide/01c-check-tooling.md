# 01c Check tooling in the repository

Source: [parameter writes](../../specs/parameter-writes.md) acceptance 4 and 5; [board workspace spec](../../specs/ux-picks-app-wide.md) acceptance 5 and 6.

The fuzzer, the jank probe, their thresholds and the minimised failure cases exist only outside Git, in `C:/Users/1337Hacker/Desktop/bezeg-ux-picks/night/` on the owner's machine. **First step: copy `night/fuzz/` (`fuzz.cjs`, `min-*.json`, `RESULTS.md`, `RESULTS2.md`, `final/*.txt`), `probe.cjs`, `CHECKLIST.md` and `GUIDE.md` into `docs/reviews/ux-picks-app-wide/night-tooling/` on the work branch**, so the rest of the plan does not depend on that folder.

## Slices

1. **Fuzzer:** port to the repo's Playwright setup behind a `just` recipe, with invariants I1 to I5 (learner wins; no A → B → A flicker; Esc stills everything; no page errors; untouched parameters stay), seed replay and shrinking. Before pucks exist it drives the tools controls, playback, board point drags, lesson Back and Next, and pan. It does not join the per-push CI gate at full size: a small seed count per pilot route runs there, the full matrix runs on demand and in the daily run.
2. **Replay cases:** F1 to F3 from the parameter-writes spec. F1 and F2 were intermittent (1 in 3 before R30), so each replay runs at least 5 times. F3's minimised list did not reproduce it; its cases are the full seeds (Taylor seed 2, Taylor lesson seed 8). Keep the unexplained waves case (two sweeps plus a card drag, `min-functions_waves-1.json`). The checker excludes typed decimals on integer-step parameters (a generator artefact).
3. **Probe:** port `probe.cjs` and its thresholds (long tasks, frame gaps, layout shift, value flicker, glides per step, Back return, board cover) behind a `just` recipe, with a 4× CPU throttle option.
4. **Clean console in development:** the dev server requests `/bezeg-2.0/bezeg-2.0/history-entry-bridge.js` (doubled base path, HTML answered, "Unexpected token '<'"). Fix the script URL so invariant I4 has no exception list.
5. **"Interrupt what moves"** in `docs/smoke-tests.md` on `master`.

## Acceptance

- The fuzzer recipe passes 50 seeds on Taylor, transformations, De Casteljau and phase portrait (free and lesson) on the work branch after tasks 01 and 01b; a seeded stale write fails I1 (observed failure recorded).
- Probe numbers on the same routes at 1440×900 and 1024×768 are recorded as the baseline for acceptance 6.
- The copied night tooling is in the repository.

On the prototype the full seed matrix never passed: before R30 every route failed (waves 0 of 6 seeds), and after R30 only the minimised cases and two full seeds were rerun.
