# Brief handoff-v12: projective conics 07b (K5 two-panel graph, F2a)

- **Role:** implementation and tests; edit permission in `.claude/worktrees/stream-functions` (branch `stream-functions`). Do not commit, push or delegate. Another worker concurrently registers the quadrature route (`src/demonstrations.ts`, `graphFactories.ts`, route/count tests, `src/graphs/functions/`, `quadrature_*` keys): do not touch those. Edit `sl.ts`, `en.ts` and `src/graphs/base/presets/PresetCatalog.test.tsx` only with targeted Edit calls (never rewrite the files; if an Edit fails because the text moved, re-read that region).
- **Goal:** the K5 graph, no route/lesson/chapter. Source: K5 in `docs/specs/projective-conics-lessons.md` (lines 129-143: default example, graph needs, acceptance 1, 2, 3, 5, 6), `docs/tasks/projective-conics/07-batch-b.md` (07b), ADR 0033.
- **Pattern to copy:** the just-accepted K4 slice `src/graphs/projective/FivePointGraph.tsx`, `fivePointModel.ts`, `fivePointEdit.ts`, `fivePointText.ts`, `FivePointControls.tsx`, their tests, its parser in `projectivePresetCollection.ts`, its registration in `src/graphs/base/presets/PresetImport.ts` and its `PENDING_ROUTE_KEYS` entry in `PresetCatalog.test.tsx`. One Reset path: the app-level Reset through `importPresetData`, no inspector Reset button. Kernels in `src/projective/` (homogeneous coordinates, `conic.ts` `classify`, `conicSampler.ts` `sampleConic`) are used, not changed; if a needed operation is missing, write it in the model file and say so.

## What to build

- **Model (pure):** `c` stored as an integer number of tenths (state the range, e.g. -30..30), an optional point on the circle by parameter (on an exact grid of your choice, stated). Derived exactly from integer tenths: the image conic X^2 + (c^2-1)Y^2 + 2cY + 1 = 0 (scaled to integers), the sign of B^2-4AC giving `ellipse | parabola | hyperbola` (c = +-1 exactly parabola, acceptance 1), the 3x3 determinant (-1 up to the scale), and the circle and L intersection (none, one tangency point, or two), whose images are the points at infinity (as directions).
- **Graph:** two panels (grep for an existing two-panel graph first and follow it; otherwise two boards or two clearly separated regions): the source plane with the unit circle, the line L: y = c and the optional point; the image plane with the image conic drawn by `sampleConic` (hyperbola branches never joined, broken at the images of the two points at infinity, acceptance 5), markers for the asymptote directions, and the image of the optional point.
- **Readouts/status:** the type from the exact discriminant; for |c| > 1, say that L misses the circle; for c = +-1, say that the tangency point is the image's only point at infinity, where the parabola meets the line at infinity (acceptance 3); for |c| < 1, name the two points and the asymptote directions.
- **Numeric check (acceptance 2):** images of circle points satisfy the image equation to 1e-12 relative. Test it, including 200 random circle points for c = 2, 1, 0, 1/2 (the spec states < 1e-15 relative; report the observed bound if that is not reached).
- **Controls:** a c slider in tenths with keyboard, an optional-point toggle and parameter control, accessible labels.
- **Locale:** one `projective_three_views_*` (or similar) block right after the `projective_five_point_*` block in both catalogs, in lockstep. Reuse existing terms (stožnica, elipsa, parabola, hiperbola, točka v neskončnosti, premica v neskončnosti; grep `sl.ts` and `docs/tasks/projective-conics/README.md` §Slovenian terms). A genuinely new term follows `docs/localization.md#choosing-new-terms` and goes in your report.
- **Preset:** a new type (e.g. `projective-three-views`) with a parser that gives actionable errors, registered with the importer, and added to `PENDING_ROUTE_KEYS` in `PresetCatalog.test.tsx`.

## Checks

- `npx tsc --noEmit --pretty false` (report errors outside your files without fixing them), `npx eslint` on touched files.
- `just unit src/graphs/projective src/projective src/graphs/base/presets src/localization` (logs to files). Never bare `npx vitest`; not the full suite. Write the first test block and run it before writing the rest.
- Model tests: the discriminant table (c=2 negative, c=1 zero, c=0 positive, matching -12, 0, 4 up to the scale), the determinant, an exact parabola at c=1 and c=-1, the intersection points, the branch break. Host test (copy `FivePointGraph.host.test.tsx`): mount, c by keyboard, type change ellipse to parabola to hyperbola, the point toggle, a language switch changing a specific board string, Preset import and the app-level Reset restoring controls and board, unmount removing this graph's objects (spy, as in K4).
- Mutation evidence for at least four new assertions (c=1 classified by floats as near-ellipse, joined hyperbola branches, wrong image map, invalid Preset accepted, language switch not applied): mutate, observe the failure, revert.

## Return

≤ 400 words: files changed, checks with log paths, mutation evidence, computed numbers, new terms, deviations as `file:line`, open questions. Logs to `C:/Users/1337Hacker/.claude/jobs/122d72dc/tmp/07b/`, never `docs/`.

Budget: grep before reading, ≤150 lines per read, output to logs. On `HANDOFF` or after about 30 turns before acceptance, write state, remaining steps, touched files and checks to `docs/reviews/feature-streams/functions/worker-projective-07b-handoff.md` and return partial.
