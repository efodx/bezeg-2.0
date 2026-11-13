# Elder identity: state note (typography verified, NOT pushed: waiting for the owner)

Spec: [elder identity](../../specs/elder-identity.md). Worktree `.claude/worktrees/elder-identity`, branch **`elder-typography`**: four local commits on top of `3ac53060` (the `origin/master` of the morning of 2026-11-13). Nothing from this stream is on `master`.

## Owner's latest instruction (2026-11-13, verbatim)

> Okay, nevermind, we'll do this another day. Right now, I want you to keep the typography but not the flower. Then push to master

## Why the push stopped (handler 5)

While the publish gate was running, `origin/master` moved to `4e844f56` "Refine Home and demonstration workspace as a botanical studio" (spec `docs/specs/botanical-studio-refinement.md`, pushed 2026-11-13 20:28 by another stream at the owner's request). It installs a different self-hosted display serif, **Newsreader** (`src/fonts/Newsreader-variable.ttf`, token `--bezeg-shell-display-font`), on the header brand, the Home headline and featured title, and the workspace title, and it restyles Home and the workspace.

A trial merge (`git merge-tree`, tree untouched) conflicts in `DESIGN.md`, `src/AppHeader.css`, `src/HomeDemonstrationsCarousel.css`, `src/WelcomePage.css` and `src/graphs/base/DemonstrationWorkspaceIdentity.css`. The conflict is two typefaces and two Home layouts for the same elements, so resolving it is the owner's decision under the AGENTS.md push rule, not a mechanical rebase. Handler 5 stopped and reported.

Choices put to the owner:

1. **Literata as the one display face (handler 5's recommendation).** Keep master's new Home and workspace layout, point its display token at Literata, drop Newsreader, and keep this branch's Literata titles on Demonstrations, the picker, Learn, chapters and lessons. Reason: the owner named this typography; Newsreader was picked by the other stream's handler under delegated direction. It rewrites part of that stream's fresh work.
2. **Newsreader as the one display face.** Drop Literata and apply master's token to the title rules this branch touched outside Home, header and workspace.
3. **Both** (Newsreader on Home, header, workspace; Literata elsewhere). Not recommended: two serif families and about 650 kB of fonts.
4. Push nothing from this stream.

Also for the owner: master's Home still renders the older outlined elder drawing beside the headline between 481 and 1599px (`.welcome-botanical`; `4e844f56` did not touch `WelcomePage.tsx`). This branch removes it. Say whether "not the flower" covers that drawing under choice 1 or 2.

## Commits on `elder-typography`

- `c564a54d` feat: Literata title typography across the site (self-hosted)
- `094ff897` docs: Literata typography in the design notes, elder identity spec and state note
- `de7bce53` chore: strip one trailing space from the Literata licence text (the gate's whitespace check rejected `src/fonts/literata/OFL.txt:21`)
- this note

No `src/elderArt`, no change to `src/sideBotanicals`, no lesson progress stem. The demo artwork stays at the local tag `elder-identity-demo-2026-11-13` and on branch `worktree-elder-identity`. Do not delete either.

## Checked on this branch (against the old base `3ac53060`, so all of it needs redoing after a rebase)

- `just build` at `094ff897`: passed. Both Literata files are bundled and hashed, the preload links in the built `index.html` match the stylesheet's font URLs, and the build names no external font host.
- Browser smoke by `bezeg-smoke` (Chromium 156, production preview 4392): Home, Demonstrations, Learn, chapter `learn/bezier-curves`, workspace `bezier/curve`, the picker and the `bezier` guided lesson at 1366x768 and 390x844 in Slovenian and English. Titles in Literata with `č š ž` from the loaded latin-ext face, no clipped title, no horizontal overflow, no console error, each font file requested once with 200, no font CDN. Drag, slider, lesson Next/Back/Exit and the keyboard language switch at 390px passed. Home shows no drawing at 1366px and the side gutters at 1920px. Report and screenshots: `C:/Users/1337Hacker/.claude/jobs/5c88e1d9/tmp/h5/` (`report.md`, `report-run1.json`, `report-run2.json`, `partB.json`, `shots/`).
- Handler 5 viewed eleven of those screenshots, and measured the header at 320 to 768px against the live site (`h5/header.cjs`): header heights are identical to master, so the two-row header at 390px in English predates this change.
- Automated suite (`just smoke-built --port 4393`): 570 passed, 1 failed (`spline-c1`, English 390px) with `net::ERR_NO_BUFFER_SPACE` while three browser runs overlapped; `just smoke-lesson spline-c1 --port 4393` then passed alone.
- Publish gate: first run stopped at whitespace (fixed in `de7bce53`). Second run passed whitespace, scope and links and failed at `check-changed` on two `phase-portraits` preview tests (`guidedExamplePreviews.test.ts`, `mathAltText.test.ts`). That is the stale Vitest module cache described in `docs/commands.md`: the PNG exists and both files pass with `--no-fsModuleCache`. The cache was not cleared (shared with other worktrees); clear it with `npx vitest --clearCache` before the next gate run if the failure repeats.

Not checked: Firefox and Safari, a physical phone, 200% text, typecheck, lint and the unit suite on this branch tip (the gate stopped before finishing them), `accept-a.cjs` (it expects the flower), and anything on top of `4e844f56`.

## Next (handler 6), after the owner chooses

1. `git fetch origin`; rebase the branch onto `origin/master` and resolve the five conflicts by the owner's choice. Under choice 1 keep one token: either rename uses to `--bezeg-font-display` or alias `--bezeg-shell-display-font` to it, remove the Newsreader files and `@font-face`, and update `DESIGN.md` so it records one display face.
2. Recheck against master's code: `just build`, then browser smoke of Home, header and workspace again at 1366, 1024, 390 and 724px in both languages (master's spec names those widths), plus the pages already covered above. Run `just smoke-built` alone, with no other browser run at the same time.
3. `just publish --recipe runtime --base <origin/master sha> --commits <ids, oldest first>`, then `just ci <sha>` until the deploy is green. Push nothing but typography: no elder artwork.
4. Record the evaluation entry (not written by handler 5: the slice was not accepted) and report to the owner in plain prose.

The 4392 preview serves this branch's Literata-only build (old base), for comparison with the live site. Leftovers for the owner's word: worktrees `elder-demo-b` (preview 4412) and `elder-demo-c` (preview 4424) can be removed.

## Tools

In `C:/Users/1337Hacker/.claude/jobs/5c88e1d9/tmp/`: `shot.cjs` (screenshots; pass `BEZEG_BASE=http://127.0.0.1:4392`, because `localhost:4391` is shared with another stream's server on IPv4), `anim.cjs`, `accept-a.cjs`, `h5/header.cjs`.

Handler rule passed on: at a context handoff, rewrite this note, commit it, and start the successor yourself from this worktree with `claude --bg -n "elder identity handler <n+1>" --agent bezeg-handler --model claude-fable-5-2 --effort high`, passing on these rules including this one.

## Noticed, outside this task

The top-level `ErrorPage` renders unstyled on a dark background (`/bezeg-2.0/bezier` without a demonstration segment lands there). The dev server logs a 404 for `/bezeg-2.0/bezeg-2.0/history-entry-bridge.js`. MathJax is loaded from `cdn.jsdelivr.net` on Learn, chapter, workspace and lesson pages; not compared with an earlier revision.
