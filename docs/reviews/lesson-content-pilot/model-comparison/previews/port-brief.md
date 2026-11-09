# Preview port brief (handoff-v13)

Role: `bezeg-worker`, implementation. You may edit only the files named under Owned paths. Never commit, push, or touch Git branches.

## Goal

Port one written lesson draft into the lesson source of one preview worktree, so the owner can judge that draft on the real site. Your dispatch message names: config `X` (a–e), lesson id, worktree path `W` (`C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/preview-w-X`).

- Draft: `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/lesson-content-pilot/docs/reviews/lesson-content-pilot/model-comparison/drafts/w-X/<lesson>.md` (read only; any `notes-*` beside it are context only).
- Source in `W`:
  - `bezier-pilot` → `src/learning/content/guidedLessons.ts` (lesson around lines 303–452, scene helpers 128–184)
  - `subdivision-guided` → `src/learning/content/constructionGuidedLessons.ts`
  - `curve-curvature-guided` → `src/learning/content/curveGeometryGuidedLessons.ts` (scenes around 228–247)
  - `polynomial-zeros-guided` → `src/learning/content/schoolFunctionGraphsBatchBGuidedLessons.ts` (from about line 64)

## Rules (settled decisions)

- **Transcribe faithfully.** Keep the draft's title, intro, step titles, frame titles, prose, observation prompts, hidden answers, calculations, step and frame count and order, and the scene described under each step ("Na grafu: ..."). Do not improve wording, fix mathematics, or repair known blockers: the owner is judging the writer's own output.
- Where the runtime cannot do what the draft asks (scene, control, readout, frame kind), use the closest achievable scene or field, and record it as a deviation. Reuse existing scene helpers and actions in the same file; add a small helper in the same file only if needed.
- Math notation (enforced by `src/learning/content/lessonMathNotation.test.ts`; never weaken or skip it): wrap every symbol or formula in prose in `\\(...\\)` or `\\[...\\]` (doubled backslashes in TS strings), use `{,}` for decimal commas inside math, and keep `latex`/`calculationLatex`/`resultLatex` fields undelimited. If the draft breaks a notation rule, apply the rule minimally and log it.
- Uniform mapping across configs: the draft's **Uvod** goes into the lesson's `summary` field; English fields copy the Slovenian text (the drafts are Slovenian only), with no deviation entry needed for either. Exception: `lessonMathNotation.test.ts` rejects `{,}` in English, so in the English copy write decimals inside math with `.` (e.g. `1.5`).
- Lesson text lives in the lesson TS file, not in `sl.ts`/`en.ts`. Do not edit localization catalogs.

## Pinned tests (handler decision 2026-11-09)

Preview branches never reach master and the build does not run tests. Assertions that fail only because the draft changed step/example structure or text (removed step ids or worked examples, pinned prose, English-differs-from-Slovenian checks) are expected: do **not** edit any test file; list those failures briefly in your return. `tsc` and `lessonMathNotation.test.ts` must pass. This overrides the test-editing permission below.

## Owned paths

- Your one lesson source file in `W`.
- That file's own test file(s) next to it (for example `guidedLessons.test.ts`, `curveGeometryGuidedLessons*.test.ts`), only assertions about your lesson, only as far as the port requires (step counts, pinned text).
- Your deviation note (below).
- Do **not** edit shared tests (`src/learning/runtime/lessonCatalog.test.ts`, `src/learning/chapter/*.test.ts`) or any other file. If one fails because of your port, report the exact failing assertion and the change it needs.

## Checks (run in `W`)

1. `npx tsc --noEmit --pretty false`
2. `just unit <your lesson file's test file(s)> src/learning/content/lessonMathNotation.test.ts` (and `src/learning/runtime/lessonCatalog.test.ts` to report, not fix, its failures)
3. Do not run `just build`, `just preview` or smoke; the handler does.

## Return (≤200 words)

Status (done/partial), files changed with `file:line` ranges, check results (pass/fail counts), any shared-test failures with the needed change, deviation count. Write the deviation note to `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/lesson-content-pilot/docs/reviews/lesson-content-pilot/model-comparison/previews/w-X-<lesson>.md` (≤150 words; "None" if none): each deviation as draft location → what the preview does instead → why.

If you receive `HANDOFF`, stop, write what is done and what remains into that deviation note under a "Handoff" heading, and return partial.
