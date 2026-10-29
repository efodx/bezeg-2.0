# Task 12 chapter browser acceptance

## Environment

- Checkout: `.claude/worktrees/bezier-patches-r2`, branch `worktree-bezier-patches-r2`, HEAD `b3c80f6`.
- Dirty state: this smoke spec and evidence note are task output; pre-existing untracked `.claude/scratch/` and `docs/reviews/bezier-patches/t12-source-ci.md` are preserved.
- The handler independently confirmed its supplied production preview at `http://127.0.0.1:4391/bezeg-2.0/` returns HTTP 200 with title `Bezeg`. The smoke spec is being run through `just smoke-built` with its own preview on port 4392 so it cannot reuse another checkout's service.
- The build provenance belongs to the existing final chapter source build: built from `4dd5f22` with chapter source changes later committed as `27330ef`; no app source changed after that successful build. Handler ran Chromium outside the sandbox through `just smoke-built` on port 4392.

## Coverage

`tests/unified-learning.smoke.spec.cjs` now inventories all nine learning-family cards in registry order, with `bezier-patches` after `parametrization`. Its patch row checks the exact eleven section IDs and headings, a stated outcome for every section in Slovenian and English, prerequisite text and route, a loaded chapter preview with bilingual alt text and captions identifying it as the catalog default scene, MathJax errors, page overflow, and contained local math at 390 CSS pixels with enlarged text. The existing chapter smoke flow checks sidebar navigation, refresh at a section anchor, and the mobile contents menu.

The shared-runtime row already exercises a Bézier guided example through its chapter return link, then checks the original invoker is focused after returning. The patch chapter currently exposes no activity invoker: `FamilyChapterPage` renders the section paragraphs, formula, and figure but does not render the patch sections' `demonstrationIds` or `investigationPrompts`. Thus patch-specific activity return, scroll restoration, and invoker focus cannot pass until task 13 wires the authored scenes/examples into the chapter. This is recorded as a task 13 integration gap, not as a failure of task 12 prose. Authored patch scenes and figures also remain task 13 work.

## Results

The exact pre-fix failure is recorded in CI run `40840496778` for head `27330ef`: `unified-learning.smoke.spec.cjs:10` expected eight learning-family cards but rendered nine. The update ties the expected count to the explicit nine-ID registry list and retains content and return-path assertions.

Handler execution of the complete focused file passed ten rows, including the repaired chapter inventory and existing example return/focus. The new patch row initially failed because its expected English heading said “Triangular Bézier patches” while the reviewed source says “Triangular patches”. The handler corrected the test expectation, then the patch row passed. Logs: `.command-logs/2026-10-29T09-17-19-560Z-40388-fc03e7c9.log` (20.5 seconds, ten passes/one test-authoring failure); `.command-logs/2026-10-29T09-17-49-146Z-32656-070d4d20.log` (6.7 seconds, corrected patch row passed).

The handler extended the narrow reading checks to both languages, explicitly rejecting empty math evidence, then reran the patch row successfully: `.command-logs/2026-10-29T09-20-03-894Z-39168-99e2af19.log` (7.9 seconds). Tested state: `b3c80f6` plus the smoke-spec edits, against the unchanged provenance-validated final chapter build. Desktop uses the configured Chromium viewport; narrow checks use 390×844 CSS pixels at 200% root text size. MathJax error and runtime-error guards passed. All eleven bilingual section headings/outcomes, the loaded default-scene figure, section refresh/navigation and mobile contents focus passed. These checks establish DOM/layout and image-load coverage, not a visual poster review or physical-device observations. No temporary presets were created. The runner disposed its own port4392 preview; the handler-owned port4391 preview remained running.

Acceptance remains partial: authored scene figures, patch activity invokers and their return/focus checks remain task13. The prerequisite route is currently plain text, not a clickable link; prerequisite-link integration remains required. No Pages deployment is claimed from these local results.
