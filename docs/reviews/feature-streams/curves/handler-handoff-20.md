# Curves stream: handler handoff 20

Handler 20 wrote this on 2026-11-02. It supersedes [handoff 19](handler-handoff-19.md). It stopped at the 150k soft threshold after BS-A-3b. No workers, previews or temporary worktrees are running. Settings unchanged: handler Opus, `--permission-mode auto`, `--effort medium`; workers `bezeg-worker` Sonnet `medium`; reviews `bezeg-reviewer` Sonnet; smoke `bezeg-smoke` (Sonnet first pass, Haiku narrow). Branch `worktree-stream-curves` equals `origin/master` at the commit of this note.

## Accepted and pushed to master

| Commit | Slice | Checks |
| --- | --- | --- |
| `74de18fe`, `005b2e7a` | BS-A-3b: `DeBoorGraph` lesson actions (`parameter` `t`; `animation` `deboor` next-step/reset/play/pause) and six-step L2 lesson on `bspline-deboor` (interim owner `splines/piecewise`). [Evidence](../../b-splines-nurbs/bs-a-3b-l2-lesson.md). | Worker: real-graph tests with mutations (Sonnet, 113k, 44 tools, ~25 min). Handler: exact-rational recomputation of every lesson number; SL title fixed to "Krivulja B-zlepka" (the smoke row too). Haiku browser check in SL plus a live switch to EN: pass, with gaps listed in the evidence. The work was rebased over master's Euler-line, Delaunay and Pascal lessons; the lesson lists were merged by keeping both sides, and the preview-copy counts are now 77/84. On `750b816d`: `just unit src/learning src/graphs/curves/bspline src/demonstrations`, typecheck, lint, build, and `smoke-lesson bspline-deboor bspline-basis projective-pascal euler-line` all passed (no `part4` failure). After the final rebase over two master commits (one-line edits to `familyChapters.test.ts` and `unified-learning.smoke.spec.cjs`), the family-chapter, preview-copy and catalog units passed on `005b2e7a`. |

## Next steps, in order

1. **BS-A-4 chapter `b-splines`** (F4): move both lessons (`bspline-basis`, `bspline-deboor`) off the interim owner `splines/piecewise` in `src/learning/chapter/guidedLessonOwnership.ts`, and remove `/bezeg-2.0/bspline` from `FAMILY_CHAPTER_PENDING` in `LearningPage.test.tsx`. Copy the pattern of a recent family chapter, such as master's triangle-geometry F4 (`3241d59b`) or the projective chapter. Read the spec's chapter section and the stream README's F4 template first.
2. **BS-A-5 media**: capture the two pending B-spline posters (`POSTER_PENDING`). In the same capture, fix Geometry's note on `interp-subdivision` (step 0 shows only the control polygon; [posters-visual.md](../geometry/posters-visual.md) line 17) by giving its recipe in `scripts/demonstration-preview-recipes.cjs:40` an action that shows the first refinement. Procedure: `docs/commands.md` line 40.
3. `G-FN` work (I2/I4, family 4) per handoff 18.
4. Deferred lows: BS-A-3b (the hull test has no mutation of its own; the fixture-knots path is untested by L2 because its vector equals the clamped default; browser gaps in the evidence); BS-A-2b (poster-pending list duplicated in `DemonstrationsPage.test.tsx:46`; `checkGraphState` only `invalid_value`; `perturbModel` assumes `knots[degree+2]`); BS-A-3a (reject assertions not mutated alone); lows from handoffs 13-18.

## Notes

- Master moves often (several streams push). `origin/master` updates whenever another worktree fetches, so check `git log HEAD..origin/master` right before pushing, and recheck non-doc files in the new commits. Count tests (`guidedExamplePreviewCopy.test.ts`), the catalog lesson-less list, `lessonMathNotation.test.ts` and the smoke `LESSONS` list are the usual collision points.
- Memory pressure on 2026-11-02 killed the self-watcher, the preview and one unit run in the background. Foreground runs, one at a time, completed; the full unit scope took about 9 min.
- Gaps carried over: `docs/capabilities.md` route table (Hermite, interpolation, Coons routes; stale "51 active graph routes"); no live SL→EN browser check for I3, I5 or D4.

## Evaluation record (not yet logged with `do-log`)

- BS-A-3b worker, Sonnet medium, v12: complete at 113k, 44 tools, ~25 min, one pass; mutation evidence for each handler; missed the genitive in the SL title.
- L2 language check, Haiku `bezeg-smoke`: 58k, 33 tools, ~10 min; it found that the inspector is not operable while the lesson panel is open, so step 3's button prompt went unverified (wording as in the accepted I5 lesson).
