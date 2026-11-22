# Brief: frame declarations through one shared step builder (task 02, slice 2)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`. Do not commit. A fuzz run may be using the browser: run unit tests only, foreground.

## Goal

A lesson frame can carry a `FrameDeclaration` (`src/graphs/base/declare/graphDeclaration.ts`, handler-owned; do not change it) from its content file to the runtime `LessonFrame`, built by one shared step builder instead of the per-file copies. Source: `docs/tasks/ux-picks-app-wide/02-declaration-contract.md` slice 2.

## Settled (handler)

1. `GuidedLessonFrame` (`src/learning/content/guidedLessons.ts`) and `LessonFrame` (`src/learning/model.ts`) gain `readonly declare?: FrameDeclaration` (the erased, non-generic form). Every adapter that turns guided frames into `LessonFrame`s passes it through unchanged (find them: `catalogLessonAdapter.ts`, chapter registries; search for where `GuidedLessonFrame` becomes `LessonFrame`). Nothing reads it yet.
2. New shared builder `src/learning/content/guidedStep.ts`: `guidedStep(content)` builds the same `GuidedLessonStep` the 45 identical local `step` copies build (explanation, optional calculation when `workedExampleId`, observation), and takes an optional `declare?: {explanation?: FrameDeclaration; calculation?: FrameDeclaration; observation?: FrameDeclaration}` that it puts on those frames. A lesson file types its declarations with `frameDeclarer<ItsGraphIds>()`.
3. Only these lesson files switch to `guidedStep` now (the pilots' plain guided lessons): find the guided-lesson files of Taylor, function transformations, De Casteljau, linear map and phase portrait that use the identical local `step`; replace the local copy with the import, nothing else. Every other file keeps its copy until task 08 converts its graph (record the remaining count).
4. Notes are highlightable already (`FrameDeclaration.highlight` takes row or note ids).
5. Shared inputs taking a declared parameter: not in this slice (the presenter work in tasks 04/05 decides how `Slider`/`CountSetter` read a `ParameterDeclaration`); write one paragraph on the current props of `Slider` and `CountSetter` (`src/inputs/`) that a declared parameter would replace, to `docs/reviews/ux-picks-app-wide/02-shared-inputs.md`.

## Owned paths

`src/learning/model.ts` (the one field), `src/learning/content/guidedLessons.ts` (the one field), the adapters (pass-through only), `src/learning/content/guidedStep.ts` + `guidedStep.test.ts` (new), the pilots' guided-lesson files (the step swap only), `docs/reviews/ux-picks-app-wide/02-shared-inputs.md`.

## Checks

- `guidedStep.test.ts`: equal output to a local copy for a sample content (with and without worked example); a declaration on each frame kind reaches the runtime `LessonFrame` through the adapter (observed failing before the pass-through exists).
- `just unit src/learning` (foreground, timeout 600000) passes, including `lessonMathNotation.test.ts` and `sceneContentAgainstGraphs`; `npx tsc --noEmit --pretty false`; `just lint`.

## Return (at most 300 words)

Files changed; the adapters found; pilot lesson files switched and the remaining local-copy count; tests and observed failure. Handoff note if you stop early: `docs/reviews/ux-picks-app-wide/notes/02-shared-gaps.md`.
