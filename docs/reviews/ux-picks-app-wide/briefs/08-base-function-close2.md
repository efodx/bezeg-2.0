# Brief: close task 08 step 2 slice 1, round 2

Role: `bezeg-worker` (Sonnet). Worktree root `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`
(branch `board-workspace-2`); never `cd` elsewhere, never create a worktree, never commit or push. Round 1's report and logs:
`docs/reviews/ux-picks-app-wide/briefs/notes/08c-*.log`; slice notes `briefs/notes/08-base-function.md`. Preserve the
uncommitted slice.

## 1. Guided-example fingerprint ignores frame declarations (handler decision)

Task 08 adds `declare` to lesson frames in every lesson file; each change currently alters `sceneFingerprint` of a prepared
example whose first frame is declared, forcing a full preview recapture per lesson. A frame's `declare` (highlights, `uses`)
acts on the workspace cards and pucks, which preview captures hide (`framing.boardOnly`, overlay hidden). Decision: the
fingerprint hashes the first frame **without** its `declare` field.

- First verify the premise: search how frame `declare` highlights are applied (`highlight` consumers under `src/workspace`,
  `src/graphs/base/declare`, the lesson runtime). If a highlight changes anything drawn on the board itself (a JSXGraph
  object's style), stop and report instead of implementing.
- Then apply it consistently wherever the fingerprint is computed: `src/learning/chapter/guidedExamplePreviews.test.ts` ~line 90,
  `scripts/generate-guided-example-inventory.cjs`, and any other script computing `sceneFingerprint` (search `firstFrame`).
  Restore `docs/reviews/illustrated-chapter-examples/capture-inventory.json` to its committed content (`git checkout --` that
  one file) and regenerate only if the generator output differs from it after your change; it should not.
- Acceptance: `just unit src/learning/chapter/guidedExamplePreviews.test.ts` passes with no manifest or PNG change
  (`git status` shows no change under `src/images/learning/examples/`), and the script tests that cover fingerprints pass
  (`scripts/*guided-example*.test.cjs`: find their `just` recipe via `just --list` / `docs/commands.md`).
- Do not touch the capture script's UI-string expectation ("Korak 1 od N · Okvir 1 od N" vs the current "Korak 1/7 · del 1/4");
  just record its file:line in your notes. The handler tracks it.

## 2. Parameter read-back assertion

`src/graphs/functions/ExponentialFunctionGraph.declaration.test.tsx` checks only that the key `a` is bound. Add an assertion
that writing `a` through the arbiter (`graph.parameters.write('a', v, 'learner')`) changes the model and that the binding's
read returns `v` (and a refused out-of-range value leaves it unchanged, if the setter refuses). Red check: make `apply` ignore
the value, observe this new assertion fail (quote the message), restore.

## 3. Linear-map probe `valueWidthDrift null (limit 1)`

`just graph-check linear-map --base http://127.0.0.1:4472/bezeg-2.0/` fails probe (`08c-gcb-linear-map.log`). Decide whether this
slice caused it: run the same graph-check with `--base https://efodx.github.io/bezeg-2.0/` (master, without this slice). Same
failure there means pre-existing: report it, no fix. A pass there means this slice broke it: find the cause (file:line) and
report; fix only if it is inside the slice's files and obvious.

## Checks

`npx tsc --noEmit --pretty false`; `just lint` on changed files; `just unit src/graphs/functions src/learning/chapter`.
Foreground, long timeout; never bare `npm test`/`npx vitest`. Send independent reads in one message.

## Return

At most 250 words: per item pass/fail with log paths, the observed red failure, files changed. Notes appended to
`docs/reviews/ux-picks-app-wide/briefs/notes/08-base-function.md` under "Close-out".
