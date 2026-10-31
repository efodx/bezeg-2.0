# Platform stream: handler handoff 2

Written 2026-10-31 by platform handler 2 at its 150k soft threshold. Step 2's code is complete and verified by unit, typecheck, lint and build; its browser acceptance has not run, so nothing of step 2 is on `master` and `G-REG` is still `closed`.

## State

- Worktree `.claude/worktrees/stream-platform`, branch `worktree-stream-platform`, pushed to `origin/worktree-stream-platform` (not `master`). Its `node_modules` is a junction to the main checkout: delete the junction before removing the worktree.
- Commits on top of `a75eb25` (= `origin/master` at 16:54Z): `4fc59c6` A10, `7fe0d6d` A9b, then the status/handoff commit. `4fc59c6` alone typechecks (checked in a throwaway worktree).
- Stream file [platform.md](../../../tasks/feature-streams/platform.md): step 2 `implemented … browser checks pending`. Gates all `closed`.

## Step 2 work and evidence

- **A10:** [evidence](../../../tasks/architecture-deepening-backlog/10-derived-registration.evidence.md) (checklist before/after, decisions, bundle sizes). Availability derives from `src/demonstrations.ts` definitions (`lesson?: false` opt-out, none set) via `LESSON_DEMONSTRATION_IDS`; `lessonCatalog.test.ts` enforces content ⇔ availability both ways (mutation observed failing). Heading resolved in `DemonstrationWorkspace` from its own Demonstration; `SiteContext.workspace`, `GraphPanelContext` and `workspaceTitle` removed. Preview map is `Partial<Record<…>>` with `src/demonstrationPreviewAssets.test.ts` (mutation observed) and `src/previewPoster.ts`. Manifest moved to `scripts/demonstration-previews/manifest.json`, 102 absolute paths made relative; `tests/smoke-catalog.cjs` updated (it parsed the removed literal list). Policy consequence recorded in the commit: authored lesson content is always offered (no hidden unreviewed lessons). Content regrouping by topic: deferred.
- **A9b:** [evidence](../../../tasks/architecture-deepening-backlog/09-lesson-action-vocabulary.evidence.md#a9b-evidence-remaining-content-legacy-deletion). Legacy path deleted (search count 0), 51-lesson runtime dump deep-equal, mutations observed, A9a's `lessonCatalog.test.ts` mutation gap closed.
- **Integrated `just check`** on the final tree: passed (276/276 files, 5182/5182 tests, build with Sass deprecation warnings only). After a whitespace-only cleanup, `just lint src/learning` passed.

## Next steps, in order

1. **Browser acceptance for step 2**, from a clean throwaway checkout of `7fe0d6d` or later (see Environment). One `bezeg-smoke` run (Sonnet: first pass over changed heading UI plus lessons), port 4311:
   - A9b: one guided lesson per family (curve basics, Bézier, rational, spline, analysis, function, patch, parameterization), stepping through at least one scene action each; 0 console errors. `just smoke-lesson <ids>` covers the lesson rows.
   - A10: workspace `<h1>` on a curve route, a function route and a patch route in SL, EN and a live SL→EN switch (memory: board text needs `onLanguageChange`; the heading is React). Catalog/home lesson links still appear for every Demonstration; catalog cards still show previews.
   - A10 "production route check": find it in [docs/commands.md](../../../commands.md) / `just --list` (likely part of `just smoke`), run it on the build.
2. If clean: mark A10 and A9b accepted in the stream file, backlog README and both task files; set `G-REG` to `open`; rebase onto `origin/master`, recheck, push `HEAD:master` promptly (other streams wait on `G-REG`). Complete the [evaluation record](../../../../.agents/skills/subagent-flow-evaluation/SKILL.md#do-log) for the step-2 workers (5 Sonnet `bezeg-worker` runs, dispatched 16:54Z–~17:50Z; tokens: A10 s1 102k/60 tools/20 min, A9b s1 54k/30/8 min, A9b s2a 88k/44/12 min, A10 s2 85k/57/17 min, A9b s2b 70k/55/33 min; no repairs needed; handler fixed two stale comments, one evidence row and trailing whitespace).
3. Steps 3–6 as in the stream file.

## Risks and notes

- Removed tests: about 70 legacy `sceneAction(...)` assertions in `analysisGuidedLessons.test.ts` and 5 in `functionGuidedLessons.test.ts` tested runtime validation of legacy strings; the type now covers names/choices and `guidedLessons.test.ts` covers finiteness. Accepted by handler 2; a reviewer may revisit.
- `lessonAvailability` order changed from hand order to catalog order; consumers use it as a set or partition (`lessonRestorationContract`).
- Background commands were killed once by OS memory pressure (owner approved restarting). If it recurs, ask before restarting.

## Environment notes

- One test slot of 4 workers machine-wide; `just check` waited 11.5 minutes for a slot and then ran 18 minutes. Run one heavy command at a time; never mutate files while a test run reads them.
- Python on Windows writes CRLF to stdout; write patches via `sys.stdout.buffer`. Hunk splitting for shared files: `git diff -U0` + `git apply --cached --unidiff-zero`.
- Clean smoke checkout: `git worktree add --detach <outside path> <commit>`, `cmd //c mklink //J <path>\node_modules <main>\node_modules`, `just build`, `bezeg-smoke` on port 4311; `cmd //c rmdir` the junction before `git worktree remove`.

## Settings to keep

Handler: `--agent claude --model opus --permission-mode auto`. Workers: `bezeg-worker` Sonnet `medium` (`high` for design-shaped slices, as for A10 slice 1). Reviews: `bezeg-reviewer`. Smoke: `bezeg-smoke` (Sonnet for this first pass, Haiku for rechecks). Smoke port 4311.
