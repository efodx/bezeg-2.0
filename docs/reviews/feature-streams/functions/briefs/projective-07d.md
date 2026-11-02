# Brief handoff-v12: projective conics 07d (Batch B F2b: K4 and K5 routes)

- **Role:** implementation, tests and a browser measurement; edit permission in `.claude/worktrees/stream-functions` (branch `stream-functions`). Do not commit, push or delegate. You are the only editor; you own `just build` and a preview on port 4315 (start it in the background, stop it by PID before returning).
- **Goal:** row 07d in `docs/tasks/projective-conics/07-batch-b.md`. Register the K4 five-point graph (`src/graphs/projective/FivePointGraph.tsx`) at `/bezeg-2.0/projective/five-point` and the K5 three-views graph (`ThreeViewsGraph.tsx`) at `/bezeg-2.0/projective/three-views`, in the Projective family after `projective-pole-polar`. No lessons, chapter sections or posters yet (F3–F5): list both ids wherever the codebase lists Demonstrations shipping without a lesson, chapter link or poster (follow the quadrature registration). Remove both keys from `PENDING_ROUTE_KEYS` and add them to `PROJECTIVE_KEYS` in `src/graphs/base/presets/PresetCatalog.test.tsx`. Spec: K4/K5 in `docs/specs/projective-conics-lessons.md` (lines 110-143) and its registration rules (lines 181-182, 201): existing routes and stored Presets valid at HEAD keep working; this adds routes only.
- **Precedents:** `git show 5aa493ba` (projective Batch A routes: catalog entries, titles, prompts, factories, preview recipes, counts) and `git show 3d5fcf5b` (quadrature route, the latest registration, with the current pending lists). Copy their shape; do not add lesson action names unless the Batch A precedent did for its graphs at F2b.
- **Locale:** titles and prompts as `projective_five_point_title`, `projective_three_views_title`, `prompt_projective_*` (check which keys already exist first: the graphs may already define titles). Slovenian titles: research per `docs/localization.md#choosing-new-terms` and the term list in `docs/tasks/projective-conics/README.md` (e.g. "Stožnica skozi pet točk", "Ena stožnica, trije pogledi"). Lockstep `sl.ts`/`en.ts`, targeted Edit calls.

## Browser measurement (ADR 0033)

Extend `scripts/projective-browser-perf.cjs` (keep existing cases) with: K4 point drag on the `ellipse`, `hyperbola` and `parabola` examples, extrapolation toggle off and on for one of them; a K4 arc-end or third-point change (clicks); a K5 c slider sweep by keyboard (ArrowRight/ArrowLeft across −3..3) or drag. Run against a fresh `just build` + `just preview 4315`, 3 runs each, and append a "Browser measurement (slice 07d)" section to `docs/adr/0033-projective-conics-exact-kernel-and-family.md` in the slice-06 table format (p50/p95/max, frames per run), with machine, commit and a one-line conclusion on whether density 360 and 200 deviation samples still stand.

## Checks

- `npx tsc --noEmit --pretty false`; `npx eslint` on touched files.
- `just unit src/demonstrations.test.ts src/Routes.test.tsx src/DemonstrationsPage.test.tsx src/learning src/graphs/base/presets src/localization src/graphs/projective` (logs to files). Never bare `npx vitest`. Observe the count/route tests fail before your registration edits (or by mutation) and report it.
- `just build`; open both routes once in the preview (direct load, no console errors) as part of the perf script.

## Return

≤ 300 words: files changed, the measurement table, checks with log paths, observed failures, new terms, deviations as `file:line`, open questions. Logs to `C:/Users/1337Hacker/.claude/jobs/bf1997d8/tmp/07d/`, never `docs/` (except the ADR section).

Budget: grep before reading, ≤150 lines per read, output to logs. On `HANDOFF` or after about 30 turns, write state, remaining steps, touched files and checks to `docs/reviews/feature-streams/functions/worker-projective-07d-handoff.md` and return partial.
