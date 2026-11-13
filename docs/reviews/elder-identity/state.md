# Elder identity: state note (typography only, ready to verify and push to master)

Spec: [elder identity](../../specs/elder-identity.md). Worktree `.claude/worktrees/elder-identity`, now on branch **`elder-typography`** (two commits on top of `origin/master` as fetched on 2026-11-13).

## Owner's latest instruction (2026-11-13, verbatim)

> Okay, nevermind, we'll do this another day. Right now, I want you to keep the typography but not the flower. Then push to master

So: **push the Literata typography to `master`; no elder artwork.** This replaces the earlier "never push" rule for this one slice. Handler 4's reading (record, the owner corrects later): "another day" postpones all elder artwork, so the lesson progress stem went out with the headline plant.

## What the two commits on `elder-typography` contain

- Literata titles site-wide: fonts in `src/fonts/literata/`, tokens and `@font-face` in `src/shellTokens.css`, title rules in the shell, Home, Demonstrations, picker, Learn, chapter and lesson stylesheets, and a preload of both font files in `index.html`.
- The Home intro as one left-aligned column, and the older outlined drawings on Home, the workspace heading and the picker removed. Both came with the typography demo the owner has been viewing. **Tell the owner plainly that Home now has no elder drawing below 1600px** (the gutters remain at 1600px and wider).
- No `src/elderArt`, no change to `src/sideBotanicals/elderGeometry.ts`, no lesson progress stem.
- Docs: `DESIGN.md`, the spec's status line, this note, one evaluation-log record.

The demo artwork (headline shoot behind the text, lesson stem) is kept at the local tag `elder-identity-demo-2026-11-13` and on branch `worktree-elder-identity` (its last commit removes the artwork; the tag is the commit before). Do not delete either.

## Checked so far

On `worktree-elder-identity` after the removal: `just typecheck`, `just lint`, `just unit src/WelcomePage.test.tsx src/learning/ChapterPage.test.tsx src/sideBotanicals src/learning/runtime/GuidedLesson.test.tsx` all pass. The squash onto `origin/master` merged without conflict. **Nothing has been checked on `elder-typography` itself**, and the 4392 preview still shows the old build with the flower.

## Next (handler 5): finish the push

1. `git status` and `git log --oneline origin/master..HEAD` (expect two commits, clean tree). `git fetch origin`.
2. Run the gate: `just publish --recipe runtime --base <origin/master sha> --commits <app sha>,<docs sha>` (see `docs/commands.md`). It rebases, runs `check-changed`, builds and pushes as a fast-forward. Fix real failures; stop and report if a fix needs a decision.
3. Browser smoke is your own step, before or right after the gate: typography touches the shared shell, so follow `docs/smoke-tests.md` (skill file `.agents/skills/smoke-tester/SKILL.md`, agent `bezeg-smoke`). At least Home, Demonstrations, Learn, one chapter, one workspace and one guided lesson at 1366 and 390px in both languages: titles in Literata with correct `č š ž`, no clipped title, no horizontal overflow, no console error, no request to a font CDN. `accept-a.cjs` in the tools folder still expects the flower and the lesson stem: those rows will fail and are not a fault.
4. After the push: `just ci <sha>` until the deploy is green, then rebuild the 4392 preview (`just build`; the specimen copy is no longer needed) or tell the owner the live site is the reference.
5. Report to the owner in plain prose: what is on master, commit hashes, what was checked, what was not (Firefox and Safari were never checked), and that the Home hero has no drawing now.

Leftovers for the owner's word: worktrees `elder-demo-b` (preview 4412) and `elder-demo-c` (preview 4424) can be removed.

## Tools

In `C:/Users/1337Hacker/.claude/jobs/5c88e1d9/tmp/`: `shot.cjs` (screenshots; default server 4391 is a Vite dev server for this worktree, `BEZEG_BASE` selects another), `anim.cjs`, `accept-a.cjs`.

Handler rule passed on: at a context handoff, rewrite this note, commit it, and start the successor yourself from this worktree with `claude --bg -n "elder identity handler <n+1>" --agent bezeg-handler --model claude-fable-5-2 --effort high`, passing on these rules including this one.

## Noticed, outside this task

The top-level `ErrorPage` renders unstyled on a dark background. The dev server logs a 404 for `/bezeg-2.0/bezeg-2.0/history-entry-bridge.js`.
