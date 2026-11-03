# Functions stream: handler handoff 33

Handler 33 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-03 at its 175k soft threshold. Stream file: `docs/tasks/feature-streams/functions.md`. Worktree `.claude/worktrees/stream-functions`, branch `stream-functions` = `origin/master` (`1837597f`) plus two local commits (see `git log -3`), backed up on `origin/stream-functions-wip-33`. **Not on master.** `origin/stream-functions` has diverged, never force-push it. Handoff 32's WIP commit `25d3c102` was replaced by these commits (soft reset, never on master).

## Done this session (local commits, verified unless noted)

- **Commit "feat: lesson N5 … (numerical 07 F3/F4)"**: lesson `numericalEulerGuidedLesson.ts` + real-graph test (all scenes out of order and twice, own Euler loop, every quoted number checked); chapter section `euler-method`; inventory `eulerExpectedFor` and capture regex with node tests; smoke row `eulerMethod` in `tests/guided-lessons.smoke.spec.cjs` (not run); count tables (authoredChapterCoverage 114, guidedExamplePreviewCopy 100/107).
  - Graph/model repairs found while integrating:
    - `eulerModel.ts`: no error ratio when 2h exceeds [x0, end x]. The h=0.5, end 0.5 scene showed ratio 1, because the 2h run was the same single shortened step.
    - `EulerGraph.tsx`: a single-node polyline (end x = x0) is hidden.
    - `EulerGraph.tsx`: the field curve is marked `viewportGenerated`. `capture-guided-example-previews.cjs` accepts a marked curve changing under framing only if its marks lie inside the presented window (`isViewportGeneratedInWindow`, tested).
    - Each repair has a test; mutations of all three failed their tests.
  - Lesson review (Sonnet): every number recomputed and correct. The SL text and the h = 1 pair are fixed: step 5 now states "at h=1 the approximation is 0 and the error 0.7358" before the 3.12 ratio. The step 3 prediction is reworded, because the readouts still show the exact value when the curve is hidden. The class now decides from the field, then checks.
  - Mutations run, all caught: quoted ratio 1,82→1,83; y0 2→3; `!state.showExact`; ratio interval rule removed; euler curve count; capture regex anchor; polyline `> 1`→`> 0`.
- **Commit "wip: Euler chapter card (numerical 07 F5) …"**: PNG `src/images/learning/examples/numerical-methods/numerical-methods.euler-method.euler-method.png` captured (field of y'=y and the point (0,1), board caption "h = 0,5, y(0) ≈ 1, napaka 0"; the root-finding and quadrature PNGs came out byte-identical), manifest, regenerated inventory, `numericalPreviewCopy.ts` entry, `guidedExamplePreviews.test.ts` ids/counts `[[2, 1], [2, 2], [1, 3]]`.

## Checks (on the tree of the two commits)

- tsc clean.
- `just lint` on all 27 touched ts/tsx/cjs files clean.
- node inventory/capture tests 30/30.
- Broad `just unit src/learning src/graphs/functions src/analysis src/demonstrations.test.ts src/Routes.test.tsx src/DemonstrationsPage.test.tsx src/presets src/localization`: 4849/4850. **The one failure** is `guidedExamplePreviews.test.ts` "publishes the numerical-methods example cards": `resolveGuidedExamplePreview('numerical-methods.euler-method.euler-method', …)` returns undefined.
  - The copy entry exists and the PNG exists, so the likely cause is that `chapterImageUrls` (`import.meta.glob` in `src/learning/chapter/guidedExamplePreviews.ts:33`) does not see the new PNG.
  - Check first whether it is a vitest/vite transform cache: run with the cache cleared, or touch the module. Then check whether `CHAPTER_GUIDED_EXAMPLE_PREVIEWS` or `copyFor` short-circuits through `guidedExamplePreviewCopy.ts:88` (`'euler-method'` demonstration-level copy) before reaching the chapter copy. Not yet diagnosed.
- `just build` passes (with the lesson text before the step 3 rewording; rebuild before any further capture).

## Next, in order

1. Fix the preview test failure above. Then rerun the broad unit set and `just build`. Push both commits as a fast-forward to `master` (fetch first and rebase; rerun the count tables listed in handoff 32's risks after any rebase). F3/F4 and F5 must land together, because the preview test requires the card once the lesson is chapter-owned.
2. Mark F3, F4 and F5 in `docs/tasks/numerical-methods/07-batch-c.md` and in the stream file. Note the two graph repairs and the capture exemption in the task file; no route or Preset change.
3. F6 Batch C gate:
   - `just check`.
   - `just smoke-lesson` (port 4320; the new `eulerMethod` row).
   - Browser smoke SL/EN at 1920 and 390, including 1920 zoom/pan frames on `/analysis/euler-method` (ADR 0037). Check that step 1 shows no polyline and steps 2 and 3 show their segments.
   - CI green.

## Open risks

- From handoff 32: count tables conflict on rebases; never `git stash` in a compound command; heredocs halve `\` (I used `node <tmp>/mut.cjs file old new` for literal replacements; it fails on CRLF-spanning strings, so use Edit for those); open owner deviation on the Fourier spectra layout.
- The board caption shows "napaka 0" at end x = x0 (error of a zero-length run). It is harmless, but a smoke reviewer may flag it.

## Settings to keep

Handler `--agent claude --model opus --permission-mode auto --effort medium`. Self-watch `--until 175000` (owner override). Launch the successor at 215k or right after closing out at the soft threshold, and pass this rule on. Workers: `bezeg-worker`, Sonnet, `medium`, with a 135k watcher each. Reviews: `bezeg-reviewer`, Sonnet. Smoke: `bezeg-smoke`, Sonnet, `medium`. Ports: 4315 (preview/capture), 4320 (`just smoke-lesson`), 4330 (field perf harness).
