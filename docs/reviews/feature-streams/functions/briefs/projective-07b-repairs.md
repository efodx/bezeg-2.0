# Brief handoff-v12: projective conics 07b review repairs

- **Role:** fixes and tests; edit permission in `.claude/worktrees/stream-functions` (branch `stream-functions`). Do not commit, push or delegate. The 07b slice is committed as `7fddd65d`; its original brief is `briefs/projective-07b.md`. Touch only `src/graphs/projective/` (three-views and five-point files) and the `projective_three_views_*` / `projective_five_point_*` blocks of `src/localization/sl.ts` and `en.ts` (targeted Edit calls, lockstep). No route, lesson or chapter changes.
- **Goal:** apply the engineering + UI and math review findings on the K5 three-views graph. Source: K5 in `docs/specs/projective-conics-lessons.md` (lines 129-143), ADR 0033. Stored Presets valid at HEAD must keep importing, except files with unknown keys (repair 2 is the accepted break; none were ever exported with extra keys).

## Repairs

1. **Off-window note.** The image panel shows ±7. Parts of the image conic or P' fall outside it: the |c| = 0.9 hyperbola branch (far vertex Y = 10), the ellipse for |c| = 1.1-1.4 (far extreme 1/(|c|-1)), and P' when off-window. Show a visible, localized note in the image panel/status when that happens (a model-derived flag, e.g. `clipped`), or rescale the image panel instead if it stays readable at classroom projection; state which you chose and why. Model tests assert the flag (or `closed` fully visible) for |k| = 9 and 11-14 tenths, plus a case well inside the window.
2. **Unknown keys.** `parseThreeViewsModel` (`threeViewsModel.ts:38`) and K4's `parseFivePointModel` (`fivePointModel.ts:77`) accept unknown keys. Reject them with an actionable message naming the key; add a test for each.
3. **Residual bound.** `threeViewsModel.test.ts:107-108`: keep one assertion at 1e-13 (observed worst 8.9e-15 over 800 points), drop the redundant 1e-12 line; adjust `:122` to 1e-13 if it is the same check.
4. **Angle slider text.** `ThreeViewsControls.tsx:56` `aria-valuetext` is a raw template string: route it through `formatNumber`/`t()` like the c slider at `:36` (new key in both catalogs if needed).

## Checks

- `npx tsc --noEmit --pretty false`, `npx eslint` on touched files.
- `just unit src/graphs/projective src/graphs/base/presets src/localization` (logs to files). Never bare `npx vitest`.
- Observed failure for each new assertion (mutation or pre-change code), reverted.
- Host test: the note appears for c = 0.9 and disappears for c = 0.5; language switch changes the note text.

## Return

≤ 300 words: files changed, the choice for repair 1, checks with log paths, mutation evidence, new keys/terms, open questions. Logs to `C:/Users/1337Hacker/.claude/jobs/bf1997d8/tmp/07b-repairs/`, never `docs/`.

Budget: grep before reading, ≤150 lines per read, output to logs. On `HANDOFF` or after about 30 turns, write state, remaining steps, touched files and checks to `docs/reviews/feature-streams/functions/worker-projective-07b-repairs-handoff.md` and return partial.
