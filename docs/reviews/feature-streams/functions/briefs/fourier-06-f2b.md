# Brief handoff-v12: Fourier series 06 F2b (route, registration and the ADR 0040 re-check)

- **Role:** implementation worker; edit permission in `.claude/worktrees/stream-functions`. Do not commit, push, stash or delegate. You may run `just build` and `just preview` on port 4330 (no other worker owns `dist/` or that port now); stop the preview when done. Edit `sl.ts`/`en.ts` only with targeted Edit calls, in lockstep, exact `t()` names, no `any` or casts.
- **Goal:** register the finished `EpicycleGraph` as a Demonstration, and run the re-check [ADR 0040](../../../../adr/0040-epicycle-rendering.md) Consequences ask for. Do not change the graph unless a measurement or a check requires it, and then say so.
- **Pattern:** the `fourier-coefficients` registration. `git log --format=%h --grep=F2b --grep=fourier-coefficients --all-match -1` finds the commit; `git show <hash> -- <file>` per file, reading only the Fourier parts. It touches `demonstrations.ts`, `graphFactories.ts`, `demonstrationPosterPending.ts`, `functionPresetCollections.ts`, the catalogs and count tests in `DemonstrationsPage`, `Routes`, `demonstrations`, `PresetCatalog`, `familyChapters`, `lessonCatalog`.
- **Registration:** route `/bezeg-2.0/analysis/epicycles`, id `epicycles`, family `analysis` right after `fourier-coefficients`, `lesson: false` for now, title Slovenian *Epicikli* / English *Epicycles*. Add `epicyclePresetCollection` to the Demonstration map under that id. Write a `prompt_epicycles`: drag the loop, raise \(N\), press play. No poster: use the pending list as the precedent does. Count tests change by one each; never loosen them to a range.

## Measurement

Add cases to `scripts/fourier-browser-perf.cjs` (production preview, headless 60 Hz; `docs/performance-plan.md`, method section only). All on the real route:

1. A drag of a **vertex**, `uneven`, \(N=50\).
2. A drag of a **cubic control**, `uneven`, \(N=50\).
3. Playback at \(N=50\) for 5 s. This covers the per-frame copy of the trace slice.
4. An \(N\) slider sweep \(1\to50\to1\).
5. Case 1 at 1920 px.

Report median and p95 frame interval and frames over 25 ms per case, and record the raw numbers in `docs/reviews/fourier-series/06-epicycle-measurement.md` under a new section "Host re-check". The threshold is ADR 0040's: p95 at most 16.8 ms and no frame over 25 ms at 60 Hz. **Do not optimise.** If a case misses it, finish the other cases, then stop and report: the ADR makes that an owner matter.

Also look at the graph on the real route with a Playwright screenshot of `uneven` at \(N=1\), the largest radii: do 48-segment circles look round at 1920 px? Say what you saw and save the image in the log directory.

## Checks

`npx tsc --noEmit --pretty false`; `npx eslint` on touched files; `just unit src/Routes src/demonstrations src/DemonstrationsPage src/graphs/base/presets src/learning src/graphs/functions/EpicycleGraph src/graphs/functions/functionPresetCollections` with logs; `just build`.

## Return

At most 250 words: files, the measurement table, what the screenshot showed, check results with log paths, open questions. Report only what you saw after your last edit. Logs to `C:/Users/1337Hacker/.claude/jobs/cb986187/tmp/fourier-f2b/`. Budget: grep before reading, at most 150 lines per read. On `HANDOFF` or after about 25 turns, write `docs/reviews/feature-streams/functions/worker-fourier-06-f2b-handoff.md` and return partial.
