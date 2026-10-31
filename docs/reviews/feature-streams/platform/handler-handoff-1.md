# Platform stream: handler handoff 1

Written 2026-10-31 by platform handler 1 at its 150k soft threshold. Step 1 is accepted and pushed; nothing of step 2 has been dispatched.

## State

- Worktree `.claude/worktrees/stream-platform`, branch `worktree-stream-platform`, rebased onto `origin/master` and pushed as a fast-forward. Its `node_modules` is a junction to the main checkout: delete the junction before removing the worktree.
- Stream file: [platform.md](../../../tasks/feature-streams/platform.md), `Run state: active`. Gates: all `closed`.
- Accepted commits (hashes after the rebase): `07cd4bd` A1 Preset storage integrity, `245d4d9` A1 follow-up (save/delete disabled while unreadable; notices no longer hide each other), `4bfaa55` A9a typed `LessonAction` vocabulary, `4329197` statuses.

## Accepted work and evidence

- **A1:** [evidence](../../../tasks/architecture-deepening-backlog/01-preset-storage-integrity.evidence.md). Unit tests pass, including a new `PresetSelector.test.tsx` that was observed failing against the pre-fix selector. Browser smoke at `df45cb9` ran on a curve route and a function route with corrupt `preset-*` keys, in SL, EN and a live SL→EN switch: all pass (alert, picker shows only the default, raw value unchanged, 0 console errors). That smoke found the two issues fixed in `245d4d9`; the fix is covered by the component test, not rechecked in a browser. Gaps: drag after a corrupt load, and a save with a typed name.
- **A9a:** [evidence](../../../tasks/architecture-deepening-backlog/09-lesson-action-vocabulary.evidence.md), review-field decisions in [guided-lessons.md](../../../specs/guided-lessons.md). Typecheck mutations were observed failing. The before/after runtime-lesson dump is deep-equal. `just unit src/learning src/graphs/patches` passed, with its 3 load timeouts passing on rerun. Gap: the three new `lessonCatalog.test.ts` assertions were not mutation-checked. The task file's "one lesson per family" browser walk is deferred to A9b, which migrates every family's content; A9a changed no lesson behavior.

## Next steps, in order

1. **Step 2:** A10 derived registration ∥ A9b.
   - A10 owns `src/learning/model.ts` in this step. Read [10-derived-registration.md](../../../tasks/architecture-deepening-backlog/10-derived-registration.md); it is "Worth exploring" and may end in "no change" with a recorded reason.
   - A9b: run `node tools/learning/migrate-lesson-actions.cjs <file>` over the remaining content files. Hand-convert what the script reports, including the `action('...')` helper in `guidedLessons.ts`/`expansionGuidedLessons.ts`. Narrow `LessonSceneAction` to `LessonAction` and delete `SceneAction`, `SUPPORTED_SCENE_ACTION_NAMES`, `sceneAction()` and `legacyActions()` (with the content-test wrappers). Strip `learnerInteraction`/`supports`. Update the iterative-lesson sentence in `docs/current-architecture.md` and the ADR 0013 amendment. The evidence file lists remaining counts per file. Review by search. A9b must not edit `model.ts`. Also mutation-check the three `lessonCatalog.test.ts` assertions. Then do the browser walk of one lesson per family.
   - When A10 is accepted (A9a already is), set the `G-REG` row to `open` and push it promptly; other streams wait on it.
2. Steps 3–6 as in the stream file.

## Environment notes

- The machine is overloaded. Six streams share the test slots: the A1 build waited 29 minutes for a slot, and a full `just unit src/learning` took 25 minutes with load timeouts. The owner's audit session added `a6cd11a` (now on this branch), which gives 1 slot of 4 workers and caps path-filtered unit runs at 2. Treat timeouts as load artifacts until a filtered rerun confirms otherwise. Run one heavy command at a time per worktree.
- Two Sonnet A9a workers each hit their budget around 30 turns. Size worker slices smaller than "the whole task", or split verification into its own slice.
- Do not mutate files while a test run is reading them: one rerun picked up a temporary typecheck mutation.
- Browser smoke from a clean throwaway checkout worked well: `git worktree add --detach <outside path> <commit>` plus a node_modules junction, `just build`, then `bezeg-smoke` on port 4311. Delete the junction before `git worktree remove`.

## Settings to keep

Handler: `--agent claude --model opus --permission-mode auto --effort medium`. Workers: `bezeg-worker` Sonnet `medium` (raise to `high` for type-design or difficult slices, with the reason recorded). Reviews: `bezeg-reviewer`. Smoke: `bezeg-smoke` Haiku for narrow checks. Smoke port 4311.
