# Brief: close task 08 step 2 slice 1 (BaseFunctionGraph opt-in, exponential worked example)

Role: `bezeg-worker`. You may edit the files listed under "Owned". Work from the worktree root
`C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace` (branch `board-workspace-2`); never `cd` elsewhere, never create a worktree, never commit or push.

## Context

Read `docs/reviews/ux-picks-app-wide/briefs/notes/08-base-function.md` (plan, recipe, status). The slice is uncommitted:
`src/graphs/functions/BaseFunctionGraph.tsx`, `ExponentialFunctionGraph.tsx`, `ExponentialFunctionGraph.declaration.test.tsx`,
`src/graphs/base/declare/parity.ts`, `parity.test.tsx`, `src/learning/content/declarationContract.test.tsx`,
`src/learning/content/functionGuidedLessons.ts`, `src/graphs/functions/__parity__/exponential-function.json`. Preserve all of it.

Handler decision (already applied in `parity.ts` ~line 204): a bare slider read-off is covered only by a declared row whose
symbol is a declared parameter's symbol and whose value equals the read-off. Do not loosen it.

## Tasks and acceptance

1. **Guided preview fingerprint.** `just check-changed` failed on `src/learning/chapter/guidedExamplePreviews.test.ts`
   ("publishes every exact prepared scene ..."): entry `functions-and-calculus.function-rules.exponential-function`
   fingerprint changed because its first lesson frame now carries `declare` (intended). Regenerate that example's inventory
   entry, capture and manifest through the project's own pipeline (`docs/commands.md` line ~84-86: the guided-example
   inventory and `capture-guided-example-previews` commands; `docs/reviews/illustrated-chapter-examples/preview-pipeline-note.md`).
   Regenerate only what this example needs; do not hand-edit hashes. If the pipeline needs a served build, a production
   preview runs on `http://127.0.0.1:4472/bezeg-2.0/` but serves a stale build; you may run `just build` (one heavy run at
   a time). Say whether the PNG bytes changed and why. Acceptance: `just unit src/learning/chapter/guidedExamplePreviews.test.ts` passes.
2. **Parity rule red check.** With the rule as applied, `BEZEG_PARITY_CHECK=1 just unit src/graphs/base/declare/parity.test.tsx` passes.
   Then show the rule bites: temporarily change exponential's `a` row value (e.g. `messageNumber(a + 1)`), observe the parity
   failure, restore. Report the failing message.
3. **Parameter assertions red check.** In `ExponentialFunctionGraph.declaration.test.tsx`, break the parameter binding once
   (e.g. `apply` ignores the value) and observe the new parameter assertions fail; restore.
4. **Checks**: `just graph-check linear-map --base` (and taylor, bisection if their earlier logs `.command-logs/gc2-*.log` did
   not show a pass; under Git Bash prefix `MSYS_NO_PATHCONV=1`), `npx tsc --noEmit --pretty false`,
   `just lint` on every changed/new source file above, `just unit src/graphs/functions src/learning/content/declarationContract`.
5. **Clean-up**: delete these untracked parity tool outputs (explicit paths, no wildcards):
   `src/graphs/compgeo/__parity__/triangle-centres.json.report.txt`, `src/graphs/curves/bezier/__parity__/decasteljau.json.report.txt`,
   `src/graphs/dynamics/__parity__/phase-portrait.json.report.txt`, `src/graphs/functions/__parity__/bisection.json.report.txt`,
   `src/graphs/functions/__parity__/exponential-function.json.report.txt`, `src/graphs/functions/__parity__/function-transformation.json.report.txt`,
   `src/graphs/functions/__parity__/taylor.json.report.txt`, `src/graphs/linear/__parity__/linear-map-basis.json.report.txt`,
   `src/graphs/linear/__parity__/linear-map-determinant.json.report.txt`, `src/graphs/patches/__parity__/patch-coons.json.report.txt`,
   `src/graphs/projective/__parity__/projective-cross-ratio.json.report.txt`. If the parity test writes them again, say so
   (consider whether they should be gitignored; report, don't edit `.gitignore`).

Owned: the slice files above, the exponential guided-example inventory/manifest/PNG files the pipeline writes.
Iterate with path-filtered `just unit <file>` in the foreground with a long timeout. Send independent reads in one message.
Never bare `npm test`/`npx vitest`/`npx playwright`.

## Return

At most 300 words: per task pass/fail with log paths, the observed red failures, files the pipeline changed, anything
you could not do. Notes to `docs/reviews/ux-picks-app-wide/briefs/notes/08-base-function-close.md`.
