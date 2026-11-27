# Lane L39 (waves), session 4: finish and verify

Role: `bezeg-worker`, edit permission on the L39 paths below only. Do not commit, push, stash or create worktrees. Never run `git stash`.

Source: `08-lane-L39.md` (lane brief) and shared `08-lane.md`; your predecessor's notes `notes/08-lane-L39.md` (read "Session 3" only; it lists what is done). The conversion, tests, lesson frames and prose are done; tsc and lint were clean.

Owned paths: `src/graphs/functions/WavesGraph*.tsx`, `src/graphs/functions/waves/**`, `src/graphs/functions/WavesLessonActions.host.test.tsx`, `src/graphs/functions/FunctionsFirstTask.test.tsx` (waves case), `src/learning/content/waves*`, `src/localization/fragments/waves.ts`, waves keys in `src/localization/{sl,en}.ts`, `src/graphs/functions/__parity__/waves.json`, `docs/localization.md` line ~249. Preserve every other change in the tree.

## Do, in order (notes "Not done" 1-6)

1. `just graph-check waves --route <route>`: the loader is in `src/graphs/functions/waves/runtime.ts`; find the route from the catalog/route registry (grep the demonstration id `waves` under `src/catalog` or `src/app`). Fix what it reports in owned paths.
2. Golden diff: `BEZEG_PARITY_GOLDEN_CHECK=1 just unit src/graphs/base/declare/parityGolden.test.tsx -t waves` and `node .command-logs/golden-cmp.cjs src/graphs/functions/__parity__/waves.golden.json` (or wherever the waves golden lives). Report only; no re-record. Expected: caption/note differences. Any curve/point/value difference is a bug: stop and report it.
3. `just unit src/graphs/functions src/learning/content/waves src/learning/content/declarationContract src/localization`; `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx -t waves`; `just unit FirstTask`. Logs to `.command-logs/l39s4-*.log`, quote failures only.
4. Browser: dev server is running at `http://127.0.0.1:4483/bezeg-2.0/` (do not start another dev server). Shots at 1440x900 and 1280x720 of the free waves page and each view-changing lesson step of both waves lessons (`?learn=1`), into `.command-logs/l39-*.png`. Look at each one: nothing a step names sits under a card; board at least two thirds of master's board area (compare with https://efodx.github.io/bezeg-2.0/ same route); legend does not cover the plot; marks box clears the cards; legend swatch colours match the curves. Fix in owned paths.
5. `just build`; `just smoke-lesson waves --port 4391 --workers=1`; `npx playwright` is forbidden, run `tests/guided-lessons.smoke.spec.cjs` and `tests/unified-learning.smoke.spec.cjs` through their `just` recipe (`just --list`, docs/commands.md).
6. Playback measurement on the free page at 1440x900, 5 s of playback: average and p95 frame time on dev 4483 vs the live site. Write the numbers into the notes file. If the branch is more than 20 % slower, report, do not optimize.
7. Delete scratch `.command-logs/l39-*` logs (by name, no wildcard rm) except the shots and the s4 logs.

## Return

≤250 words: per step pass/fail with the log path, golden differences by kind, measurement numbers, files changed with `file:line` for any fix, anything still unverified. Append a "Session 4" section to `docs/reviews/ux-picks-app-wide/briefs/notes/08-lane-L39.md`. On `HANDOFF` from the budget hook, stop and write the note with what is left.
