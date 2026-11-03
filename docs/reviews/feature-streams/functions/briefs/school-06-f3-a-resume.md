# Brief handoff-v12: school function graphs 06 F3 + F4 Part A resume (lesson S3: verification)

- **Role:** checks, count updates and fixes; edit permission in `.claude/worktrees/stream-functions`. Do not commit, push or delegate. You are the only editor.
- **Start here:** Part A of `docs/reviews/feature-streams/functions/briefs/school-06-f3f4.md` (its Checks and Return are your acceptance) and the previous worker's note `docs/reviews/feature-streams/functions/worker-school-06-f3-a-handoff.md` (files, remaining steps). The lesson, registration, chapter section and script changes are written and uncommitted.
- **Do:** the count updates the note lists (`guidedExamplePreviewCopy.test.ts`, `authoredChapterCoverage.test.ts`, and any other count test the unit run exposes); the smoke row for `polynomial-zeros` in `tests/guided-lessons.smoke.spec.cjs` (pattern: the Batch A rows; `lessonSmokeCoverage.test.ts` requires it); run `just typecheck` and `just unit src/learning src/graphs/functions src/localization src/demonstrations.test.ts` (`BEZEG_MEMORY_FLOOR_GB=0.5`, logs to files) and fix what fails; mutations, one per new assertion kind in the lesson test.
- **Expected failure, leave it:** `src/learning/chapter/guidedExamplePreviews.test.ts` needs the card PNG, inventory and manifest entry for the new lesson; the handler captures those in F5 (precedent `bc786aad`). Do not add an exemption or a placeholder; report that test's failure lines only.
- **Edit lesson text only with the Edit tool** (Bash heredocs halve backslashes here).

## Return

≤ 300 words: files, checks with log paths (failures only), mutation evidence, fixes as `file:line`, the scene list if it changed. Logs to `C:/Users/1337Hacker/.claude/jobs/dae24822/tmp/s06/`. Budget: locate before reading; ≤ 150 lines per read. On `HANDOFF` or after about 30 turns, append your state to the handoff note above and return partial.
