# Functions stream: handler handoff 10

Handler 10 (Opus 5.5, `--permission-mode auto`, `--effort medium`) wrote this note on 2026-11-01 at the 150k soft threshold. No workers are running. `G-FN` and `G-REG` are open. `Run state: active`.

## State

- **Worktree:** `.claude/worktrees/stream-functions`, branch `worktree-stream-functions`. The `node_modules` junction points to the main install; delete it before removing the worktree.
- **Pushed to `master`:** `e276f76e..c5e75f50`, then this note.
- **Accepted this session:**
  - Projective 06 **smoke** (Sonnet `bezeg-smoke`, port 4315, build `bf7ea6fd`). All three routes passed:
    - pointer, touch and CPU-throttled drags;
    - the live SL/EN switch and the status regions;
    - Preset save, reload and restore;
    - the malformed-import messages, with no console errors.

    The smoke found three issues, fixed in `33deac98`:
    - **Cross-ratio at 390 px:** the on-board ratio lines overlapped. Below a 640 px canvas they are now hidden, because the status region carries the same text.
    - **Pascal line pair:** the side names piled up, and the "P = ∞" board text covered A₃. The side names now step 18 px apart, and ideal points are named only in the status.
    - **Half-turn snap-back:** dragging a Pascal handle exactly onto the shared base point returned it to its start, because that pointer position has no direction. The drag now takes the tangent limit.

    The worker's regression tests fail when their fixes are reverted. The handler checked F1/F2 by mutation and the worker checked #3 before its fix. A handler browser check passed: the 390 text is hidden, the 1440 text shows, and Pappus has no "∞" text and separated side names.
  - Numerical methods 04 **F2b**, `c5e75f50`:
    - route `/bezeg-2.0/analysis/root-finding` in the Analysis family, with `lesson: false`, its poster in `POSTER_PENDING` and a preview recipe whose box has not been tried;
    - animation id `root-finding`;
    - lesson parameters `root-x0`/`root-x1` and choices `root-finding-example`/`root-finding-method` in `src/learning/model.ts`, handled by `RootFindingGraph.lessonFunctionActions()`;
    - `PENDING_ROUTE_KEYS` removed;
    - locale keys `root_finding_title` and `prompt_root_finding`.

    The handler's browser check passed: the title switches live between "Tangentna in sekantna metoda" and "Newton and secant methods", Next step adds a table row, and the card is listed on `/bezeg-2.0/demonstrations`.
- **Rebase:** `lessonCatalog.test.ts` conflicted, because upstream gave `interval-sweep` a lesson. I kept `root-finding` and dropped `interval-sweep` from the no-lesson list.
- **Checks at `c5e75f50`:**
  - `just typecheck` passed.
  - `just unit` passed on the shared contracts (`lessonCatalog`, `demonstrations`, `Routes`, `DemonstrationsPage`, preview assets, `src/graphs/base/presets`, `GraphTransientState`, `familyChapters`, `LearningPage`), on RootFinding and on `src/graphs/projective`.
  - Before the rebase, the same tree also passed `src/graphs/functions`, `src/analysis`, `src/projective`, all of `src/graphs/base`, `src/learning/{content,chapter,model}`, `just build` and `just lint` on the touched paths.
  - The full unit suite was **not** run this session, because of memory.
- **Memory:** free memory stayed at about 1.5–1.8 GB. Claude Code reaped the background preview, the context watcher and a background unit run while the session was idle. Run heavy checks in the foreground in chunks, with `BEZEG_MEMORY_FLOOR_GB=0.5`. Start a preview only right before the browser script that uses it.

## Next, in order

1. **Family 2 05 F2a, split in two.**
   - **(a) S1 transformation graph:** catalogue `src/analysis/schoolFunctions.ts` (`TransformedFunction`, `TRANSFORM_BOUNDS`, `POWER_SHAPES`). Spec S1 is at `docs/specs/school-function-graphs-lessons.md` lines 80–86. Add the ghost toggle, the tracked point \((u,v)\mapsto(u/b+c,\,av+d)\) and the composed-rule readout. Reject \(b=0\). A change of base shape keeps the parameters.
   - **(b) S2 inverse/log graph:** spec lines 88–93.

   Each slice gets a new collection in `functionPresetCollections.ts` and the matching `PENDING_ROUTE_KEYS` entry in `PresetCatalog.test.tsx`, in the same slice. Terms are in `docs/tasks/school-function-graphs/README.md` "Slovenian terms": premik / raztegnitev / zrcaljenje, inverzna funkcija. Before writing each brief, re-read A7 (`docs/tasks/architecture-deepening-backlog/07-function-model-rules.md`) and A8 (`08-function-graph-sharing.md`). Platform A3 will change `BaseFunctionGraph.tsx`, so keep F2a out of it.
2. **Fourier 03 F2a** (`docs/tasks/fourier-series/03-batch-a-graph.md`; ADR 0034 §1; kernels `src/analysis/fourier.ts` and `fourierExamples.ts`). It can run beside 1a; that is two workers. The terms are in `docs/tasks/fourier-series/README.md`. The first use of *Gibbsov pojav* glosses it once.
3. **Numerical methods 05:** lessons, chapter and media for Batch A, using the `root-finding` animation and the lesson parameters above. When the lesson ships, set `lesson` on the Demonstration and remove `root-finding` from the no-lesson lists in `lessonCatalog.test.ts`, `DemonstrationsPage.test.tsx` and `familyChapters.test.ts`.
4. **Projective 06 F3–F6.**

## Deferred items (low)

- **Pappus example:** the P₁ label sits close to A₂, because the points themselves are close.
- **Cross-ratio:** the narrow-board text hide was checked at load only, not after a live window resize.
- **Smoke gaps:**
  - field-level import validation (only a wrong `version` was tested);
  - pole-polar at 390 px was not viewed;
  - keyboard nudge was not checked.
- **Root-finding:** the preview recipe box `[-4.5, 6, 4.5, -3]` is unverified until media capture. The items deferred from handoff 9 still stand.

## Lessons for briefs

- The board is not `.jxgbox`. Locate it as the `svg` wider than 300 px, and its text as `.JXGtext`. Set the language through `#bezeg-language`. Playwright scripts outside the repo need `NODE_PATH=<worktree>/node_modules`.
- The smoke worker could not attribute leftover headless Chrome processes. Ask workers to log each launched PID.

## Settings to keep

Successor `--agent claude --model opus --permission-mode auto --effort medium`; workers and reviewers `bezeg-worker` / `bezeg-reviewer` Sonnet `medium`; smoke `bezeg-smoke`; port 4315.
