# Brief handoff-v12: projective conics 07a resume (K4 five-point graph, F2a)

- **Role:** implementation and tests; edit permission in the stream worktree `.claude/worktrees/stream-functions` (branch `stream-functions`). Do not commit, push or delegate.
- **Goal:** finish 07a. The full original brief is `docs/reviews/feature-streams/functions/briefs/projective-07a.md` (what to build, examples with expected numbers, checks); the previous worker's partial state is `docs/reviews/feature-streams/functions/worker-projective-07a-handoff.md`. The source is already written and committed in the `wip:` commit at HEAD; acceptance is K4 acceptance 1–7 in `docs/specs/projective-conics-lessons.md`.
- **Scope:** `src/graphs/projective/fivePoint*.ts(x)`, `FivePointGraph.tsx`, `FivePointControls.tsx`, the `projective-five-point` parser in `projectivePresetCollection.ts`, its registration in `src/graphs/base/presets/PresetImport.ts`, the `projective_five_point_*` locale block in `sl.ts`/`en.ts`, and new tests next to them. Kernels in `src/projective/` are read only. Fix defects you find in the written source; keep the design unless a test shows it wrong.
- **Context:** existing stored Presets and routes valid at HEAD must keep working (this slice adds a Preset type; no route). Machine changed: 63 GB, test slots via env; no memory floor override needed.

## Steps

1. Rerun `npx tsc --noEmit --pretty false` and `npx eslint` on touched files; fix.
2. Write `fivePointModel.test.ts` (each example's exact numbers from the original brief: conic up to scale, P1, w²/w, Farin points, shoulder, denominator zeros, line-pair/pencil statuses, deviation < 1e-9 on the three conic examples, parse refusals with actionable errors, edits snapping to 1/5, stale flag and last-unique logic, extrapolation pieces never crossing a denominator zero), `FivePointGraph.host.test.tsx` (copy the pattern of `PolePolarGraph.host.test.tsx`: mount, drag/step a point, example switch, degenerate and stale state, language switch updates board text, Preset import and Reset, unmount leaves no board objects), and a parser case in `projectivePresetCollection.test.ts` (plus the PresetImport test if one enumerates types).
3. `just unit src/graphs/projective src/projective src/localization src/graphs/base/presets` (adjust paths to where tests live). Never bare `npx vitest`; not the full suite.
4. Mutation evidence for at least four new assertions (wrong P1, wrong weight, crossing a denominator zero, stale flag not set, invalid Preset accepted): mutate, observe the failure, revert.

## Return

≤ 400 words: files changed, checks with log paths, mutation evidence (assertion → observed failure), example numbers as computed by your tests, defects fixed in the existing source as `file:line`, new Slovenian terms, open questions. Logs go to `C:/Users/1337Hacker/.claude/jobs/122d72dc/tmp/07a/`, never `docs/`.

Budget: locate with `grep -l`/`-c` before reading; read ≤ 150 lines per call; send test and lint output to log files. On a `HANDOFF` message, or after about 30 turns before acceptance, stop at a consistent point, overwrite `docs/reviews/feature-streams/functions/worker-projective-07a-handoff.md` with state, remaining steps, touched files and checks, and return as partial.
