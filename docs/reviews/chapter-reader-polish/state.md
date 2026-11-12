# Chapter reader polish: state

Handler 2 finished the pass on 2026-11-12. The work is verified and pushed to the branch; it is not on `master`.

## Where

- Worktree `.claude/worktrees/chapter-polish`, branch `worktree-chapter-polish` on `origin`, based on `origin/master` `01ca058a`.
- Spec: [chapter-reader-polish](../../specs/chapter-reader-polish.md). Its Decisions section is the design and its Verification section holds the results.
- `node_modules` in this worktree is a real `npm ci` install. Do not junction it to the main checkout.

## Owner direction, verbatim

`/impeccable polish the way chapters look in /bezeg-2.0/learn, for example bezeg-2.0/learn/convexity-hulls.`

## Done

- `ecbc56bc` (handler 1, committed as WIP): reader on shell roles, one measure, projection size, contents rail, cards, chapter-end blocks. Verified by handler 2 without changes to those decisions.
- `dd97f717`: per-chapter document title (`src/learning/chapter/useChapterDocumentTitle.ts`, with a unit test).
- `15927fa2`: labels that were fixed `rem` sizes now scale with `--chapter-text`; `DESIGN.md` has a "Chapter reader" section.
- The commit after those: spec Verification section and this note.

Checks at `15927fa2`: typecheck, lint, `just unit src/learning` (2171 tests), build, and `tests/unified-learning.smoke.spec.cjs` (39 tests) all pass.

## Next step, for the owner

Run `just publish` from this worktree to rebase onto `origin/master`, verify and push to `master`. The session that did this work may push only the branch.

## Follow-ups outside this pass

- Formula tab stops (166 per chapter), the draft closing note in `FamilyChapterPage.tsx`, and run-in heads such as `Cilj razdelka:` set as plain text (from the `/learn/sweep-algorithms` critique).
- The Bézier chapter's closing paragraph shows literal asterisks around a thesis title (`*Orodje za grafični prikaz ...*`).
- The drawing playground's toolbar and side note keep their own fixed sizes at 1920px.
- The dev server answers 404 for `/bezeg-2.0/bezeg-2.0/history-entry-bridge.js` on every route.
- Only Chromium was checked.

## Evidence

`docs/reviews/chapter-reader-polish/shots/` is untracked: captures plus `measure.cjs` and `harness.cjs`. Do not commit it.
