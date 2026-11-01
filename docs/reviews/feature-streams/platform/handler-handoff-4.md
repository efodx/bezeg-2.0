# Platform stream: handler handoff 4

Written 2026-11-01 by platform handler 4 at a step boundary. Context was high after three full checks and two smoke rounds.

## State

- Worktree `.claude/worktrees/stream-platform`, branch `worktree-stream-platform`. `node_modules` is a junction to the main checkout: delete the junction before removing the worktree.
- **On `master` (`27dc4f7a`):**
  - Step 3 A4 is accepted (`c620ad48`).
  - The A7 convexity pilot (`be74f83e`) is verified; A7 itself stays in progress.
  - Records: `2f28b020` and `27dc4f7a`.
- **Committed, not on `master`:** `f9b40c0d`, A7 slice 2a, plus this note. It is pushed to `origin/worktree-stream-platform-5`. The older `-3` and `-4` branches predate rebases; ignore them.

## Checks run

- `just check` passed on `3e8ddaf0`: 360 files, 6561 tests and the build.
- `just check` passed again on `2f28b020`, after the rebase onto `dc899f60`: 383 files, 7039 tests (1 skipped) and the build. An intermediate run was killed by OS memory pressure and restarted with owner approval. If a run is killed again, ask the owner before restarting.
- Browser evidence for A4 and the A7 pilot is in the two evidence files under "Handler verification (2026-11-01)". All checks passed.
- Slice 2a (`f9b40c0d`):
  - What changed: `DomainError` built from a `Message` renders lazily. `GuidedLesson` and `LessonSession` keep the original `Error`, so the text follows a language switch. The English fallback became `guided_lesson_scene_error`. An unreachable `guided_lesson_action_unavailable` alert was removed.
  - Checks on the final tree: worker typecheck and `just lint src` passed. The handler reran `just unit src/learning/runtime src/graphs/functions` and `just typecheck`; both passed. Four new tests were observed failing first.
  - Not run on this commit: `just check`. No smoke was run either: apart from the live retranslation it is behaviour-preserving and covered by unit tests.

## Next steps, in order

1. A7 slice 2b–2d. Inventory: A7 evidence, "Slice 2 inventory". It is unchanged on master as of `27dc4f7a` (21 models, 87 `new DomainError` lines). The pattern is under "The pattern" in the same file. Rules:
   - Edit messages use `currentLanguage()`; file messages use the "en" form.
   - Issues are data, never text.
   - Collection tests stay unchanged.
   - Every model gets direct tests.
   - Run each slice as a `bezeg-worker` Sonnet `medium` worker, serially or at most two at once. Slices share `functionPresetCollections.ts` and `sl.ts`/`en.ts`, so give each worker exclusive edits to its own `diagnoseX` blocks, or run them serially:
     - 2b: Bisection, MeanValue, Accumulation, Darboux.
     - 2c: Extrema, Taylor, Sequence.
     - 2d: UniformConvergence, Complex (with complexReciprocal/complexRoots), FixedPoint.
   - Then decide on the parsers that have no diagnosis (linear, exponential, trigonometric, continuity, derivative, riemann, areaBetween, arcLength) and on the string throws in LinearMap. The goal is that no English reaches learners. Either migrate them or record why not.
   - Review each slice with a `bezeg-reviewer` Sonnet (engineering + localization).
2. A7 verification: `just check`, then a browser check of invalid input and Preset import on two function routes in both languages. Use `bezeg-smoke` Haiku with exact locators: hints are `p.number-input-hint[role=status]`; the import modal opens from the "Uvozi prednastavitve"/"Import presets" button behind "Shrani"/"Save", uses `#preset-import-file`, and shows `.modal [role=alert]`. Build invalid files from the collection unit tests' fixture shape. The empty export `{}` is not a valid fixture. Then accept A7 and push `HEAD:master` (fetch, rebase, recheck).
3. Evaluation record for step 3 (telemetry below plus handoff 3's), then step 4: A6 ∥ A8.

## Delegation telemetry

- Smoke 1 (`bezeg-smoke` Haiku, A4 + A7, dispatched 01:28Z): reached its 78k watcher threshold at 47 turns. HANDOFF report at about 88k / 50 tools / 14.5 min. A4 was fully covered; A7 was partial because the brief lacked locators.
- Smoke 2 (Haiku, A7 remainder, 01:43Z): about 46k / 26 tools / 9 min. Field hints passed in SL and EN; the import check was blocked by a missing fixture. Its leftover background scripts had to be stopped with TaskStop.
- The handler ran the file-import check itself with one Playwright script, built from `functionPresetCollections.test.ts` fixtures.
- Slice 2a worker (`bezeg-worker` Sonnet `medium`, 07:52Z): about 39k / 21 tools / 15 min, no repair. Its wide unit run started before its final two edits.
- Lesson: smoke briefs should carry DOM locators and fixtures from the start. Both gaps cost a second worker.

## Settings to keep

- Handler: `--agent claude --model opus --permission-mode auto`.
- Workers: `bezeg-worker` Sonnet `medium`.
- Reviews: `bezeg-reviewer` Sonnet.
- Smoke: `bezeg-smoke` Haiku.
- Ports: 4311 (4312 for a second preview).
- Machine memory is tight (about 2–4 GB free, with other streams running checks). Run one heavy job at a time.
- Never force-push.
