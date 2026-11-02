# Functions stream: handler handoff 15

Handler 15 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-02 after the 150k soft threshold. `G-FN`, `G-REG` and `G-HL` are open. `Run state: active`.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`, at the handoff commit on `origin/master`. The `node_modules` junction points to the main install; delete it before removing the worktree.
- **Pushed to `master` this session:**
  - `98d667e6` docs: `docs/capabilities.md` no longer counts Learn chapters (handoff 14's deferred item).
  - `dc2470e4` F5 for numerical, school and Fourier. Chapter-owned cards: generator entries `numericalExpectedFor`, `schoolFunctionGraphsExpectedFor`, `fourierExpectedFor`; capture families with route regexes; copy in `numericalPreviewCopy.ts`, `schoolFunctionGraphsPreviewCopy.ts`, `fourierPreviewCopy.ts`; four PNGs under `src/images/learning/examples/<chapter>/`. Highlight recipes are not supported for chapter-owned chapters, so every card is the first frame. Catalog posters already existed.
  - **Shared capture tooling changed** (`scripts/capture-guided-example-previews.cjs`, `assertPresentationGeometryStable`/`isSameGraphOnOverlap`): curves are paired by board id, and view-clamped function plots are compared only on screen in both views, within 1e-3 of the shared height. The test "accepts a view-clamped function graph…" fails if either change is reverted (both mutations observed).
- **Checks on `dc2470e4` (after rebase):** `tsc` clean; `node --test` on both script tests 25/25; `just unit src/learning/chapter src/learning/content src/learning/LearningPage.test.tsx` passed; eslint clean on touched files; `just build` passed before capture. I read all four PNGs. None is cropped, blank or overlapping, and each matches its SL/EN caption.
- **Handler fixes to the worker's output:** the copy files had single backslashes (`'\(x\)'` evaporates in a TS string); now doubled. The generator test expected `line` where the runner reports `segment`. Capture needs `PREVIEW_BASE_URL=http://127.0.0.1:4315/bezeg-2.0` (with the base path).
- **Worker:** F5 Sonnet `medium` hit its 135k budget at 67 turns (notes: `worker-f5-notes.md`, untracked). The handler finished the tooling fix and the captures.

## Next, in order

1. **Projective 06 F3a:** brief ready at `briefs/projective-06-f3a.md` (projective lesson-action kind and cross-ratio actions, lesson K1, registration). Then F3b (K2 Pascal, `PascalGraph` actions) and F3c (K3 pole/polar), serially, as they share registration files. Then F4 chapter, F5 cards (chapter-owned mode as above), F6.
2. **F6 gates** for numerical, school and Fourier: `just check`, smoke of the family routes and the Learn chapter cards in SL and EN with a live switch (the new cards were not yet browser-checked on the Learn page), hosted CI. These can run before or between projective slices, but not during a capture.

## Deferred items (low)

- The Fourier partial sum \(S_1\) renders visibly polygonal (coarse sampling in the Fourier graph; see the Fourier card PNG). Existing behaviour, not F5's. Consider denser sampling at F6 or in Batch B.
- Handoff 13's items still stand (Fourier scenes cannot zoom; the uniform-convergence link is prose plus a `sources` entry).

## Settings to keep

Successor `--agent claude --model opus --permission-mode auto --effort medium`. Workers `bezeg-worker` Sonnet `medium`; smoke `bezeg-smoke`; port 4315. Heavy checks with `BEZEG_MEMORY_FLOOR_GB=0.5`, in the foreground. Point worker logs at the job tmp folder, never `docs/`. Never force-push; push only `HEAD:master`, rechecking after the rebase before pushing.
