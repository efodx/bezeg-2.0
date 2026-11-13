# Elder identity: state note (handler 5 handoff: polish committed, CI repair in progress, push blocked on GitHub login)

Spec: [elder identity](../../specs/elder-identity.md). Worktree `.claude/worktrees/elder-identity`, branch **`elder-typography`**, rebased onto `origin/master` `4e844f56`. Nothing from this stream is on `master` yet.

## Owner's instructions (2026-11-13, verbatim, newest last)

> Okay, nevermind, we'll do this another day. Right now, I want you to keep the typography but not the flower. Then push to master

> yeah opt1, before publishing though give it to an independent fable 5.2 xhigh subagent to critique/polish, telling him we really want to make this beautiful, get it's opinion and trust it, implement that round and publish

> this is what the other agent said, so i gues youll repair the ci as well [the botanical studio stream left the source repair of red master CI to this stream; Pages still serves `644652a2`]

"opt1" is: Literata as the one display face on master's botanical studio layout of Home, header and workspace; Newsreader removed. Push nothing but typography and the CI repair: no elder artwork. Do not delete tag `elder-identity-demo-2026-11-13` or branch `worktree-elder-identity`.

## Done by handler 5 (commits on `elder-typography`, oldest first, none pushed)

- `79712114` feat: Literata title typography across the site (self-hosted)
- `438eb95e` docs: Literata typography in the design notes, spec and state note
- `46911eb8` chore: strip one trailing space from the Literata licence text
- `1d178d3c` docs: state note (push stopped at the design conflict)
- `96ebc330` feat: Literata as the one display face; Newsreader removed
- `4af44c27` feat: typography polish round from the independent critique (two Fable 5.2 xhigh critics; critique in [typography-critique.md](typography-critique.md); `DESIGN.md` carries the shipped numbers). It removes the older outlined elder drawing from Home; the side botanicals at 1600px and wider stay. **Tell the owner: the Home hero has no elder drawing below 1600px.**
- this note

Rebase resolution: the four conflicted stylesheets and `WelcomePage.tsx` took master's side, then `96ebc330` switched master's four title rules to `--bezeg-font-display`.

## Checked on the polished tree (dev server, Chromium only)

Critic's measurements over 84 page loads in both languages at 320 to 1440px: no horizontal overflow, no clipped or off-screen title, header heights unchanged, workspace heading and guided-lesson panel no taller on phones than before. `just typecheck`, `just lint src/WelcomePage.tsx`, `just unit src/WelcomePage.test.tsx` passed. Handler 5 viewed three after-shots (`C:/Users/1337Hacker/.claude/jobs/5c88e1d9/tmp/h6/after/`). **Not checked on this tree: production build, the Playwright suite, the full unit suite, Firefox, Safari, a real phone.** Everything listed in the previous note's checks was on the old base and no longer counts.

## Red CI on master (`4e844f56`, run 43492649243) and its repair

All four browser-smoke shards failed; unit, lint, typecheck and build passed; deploy skipped. CI logs and artifacts are unreadable with the current login. Reproduced locally in scratch worktree `.claude/worktrees/h5-ci-repro-4e844f56` (detached at `4e844f56`, `node_modules` junction, port 4394): 8 failed, 563 passed. Log `C:/Users/1337Hacker/.claude/jobs/5c88e1d9/tmp/h5/ci-repro.log`; details in that worktree's `.command-logs/2026-11-13T20-07-34-312Z-4820-9879431e.log` and `test-results-4394/`.

1. `tests/curve-ownership.smoke.spec.cjs:162` batch export restore: `restored` differs from `entry` (line 194).
2. to 4. `tests/guided-lessons.smoke.spec.cjs:2733` lessons `rational-function`, `definite-integral`, `accumulation`, en 390x844: board points outside the lesson view.
5. `tests/lesson-experience-checks.cjs:116` at 390px the board starts 7px above the collapsed lesson tab's bottom.
6. and 7. `tests/lesson-experience-checks.cjs:193` sl and en landscape: `locator.click` times out.
8. `tests/lesson-graph-access.smoke.spec.cjs:96` short landscape in Presentation: board width 0.

A `bezeg-worker` (Sonnet) was repairing these **in the scratch worktree** when handler 5 handed off, under a brief that forbids editing tests and the `.workspace-heading h1` type rules. Its outputs, if it finished: patch `C:/Users/1337Hacker/.claude/jobs/5c88e1d9/tmp/h5/ci-repair.patch`, or a partial note `.../h5/ci-repair-handoff.md`. Its report went to handler 5's session, so read the files; if neither exists, `git -C <scratch> diff` shows what it had, and you may need to dispatch a fresh worker from the list above.

## Blocker for the owner

`gh auth status` reports the `efodx` token invalid and a push dry run fails ("could not read Username"). **Nobody can push until the owner runs `gh auth login -h github.com`.** Do not touch credentials. The families-prep handler (session "families-prep state resume") knows, agreed the repair is ours, and holds its own row in `tests/guided-lessons.smoke.spec.cjs` until our fix is on master.

## Next (handler 6)

1. Collect the repair: check the patch applies to this branch (`git apply --check`), apply, and review it against the botanical studio spec (`docs/specs/botanical-studio-refinement.md`) and the brief's rules. Commit it separately (`fix:`).
2. Verify the combined tree here: `just build`; `just smoke-built --port 4393` alone, with no other browser run at the same time (a `net::ERR_NO_BUFFER_SPACE` failure is socket exhaustion: rerun that test alone); a short `bezeg-smoke` pass with screenshots of Home, workspace and a lesson at 1366 and 390px in both languages, judged from the pictures. If `check-changed` fails on two `phase-portraits` preview tests, that is the stale Vitest cache (`docs/commands.md`): confirm with `--no-fsModuleCache`, then `npx vitest --clearCache`.
3. Small doc leftovers before publishing: `docs/specs/side-botanicals.md:15,19` and `docs/specs/elder-identity.md:27` still describe `welcome-botanical` as present below 1600px; `DESIGN.md:98` says the lesson frame heading is 20px (ships at 22px) and its Learn and chapter sections still name sans and Georgia headings. Add a line to `docs/specs/botanical-studio-refinement.md` recording the owner's Literata decision and the Home drawing's removal, and the evaluation entry (`.agents/skills/subagent-flow-evaluation/SKILL.md#do-log`).
4. When the owner has logged in: `git fetch origin`, then `just publish --recipe runtime --base <origin/master sha> --commits <ids oldest first>`; `just ci <sha>` until the deploy is green. Never force-push.
5. Remove the scratch worktree (`git worktree remove .claude/worktrees/h5-ci-repro-4e844f56`; its `node_modules` is a junction: remove the junction first with `cmd //c rmdir`, never recursively). Rebuild the 4392 preview or tell the owner the live site is the reference.
6. Report to the owner in plain prose: what is on master, hashes, what was and was not checked, the Home hero without a drawing below 1600px; then stop and wait.

Leftovers for the owner's word: worktrees `elder-demo-b` (preview 4412) and `elder-demo-c` (preview 4424) can be removed.

## Tools

`C:/Users/1337Hacker/.claude/jobs/5c88e1d9/tmp/`: `shot.cjs` (pass `BEZEG_BASE='http://[::1]:4391'` for this worktree's dev server or `http://127.0.0.1:4392` for the build preview; `localhost:4391` on IPv4 is another stream's server), `h5/header.cjs`, `h6/measure.cjs` with the critics' before and after data.

Handler rule passed on: at a context handoff, rewrite this note, commit it, and start the successor yourself from this worktree with `claude --bg -n "elder identity handler <n+1>" --agent bezeg-handler --model claude-fable-5-2 --effort high`, passing on these rules including this one.

## Noticed, outside this task

The top-level `ErrorPage` renders unstyled on a dark background. The dev server logs a 404 for `/bezeg-2.0/bezeg-2.0/history-entry-bridge.js`. MathJax loads from `cdn.jsdelivr.net`.
