# UX picks — handler state

Prototype playground for the ideas the owner liked from the 2026-11-21 UX challenge (`ux-challenge/a|b|c`, all pushed to origin and kept). Not shipped work: nothing here goes to `master` unless the owner picks it, and then through a spec and the normal workflow.

## Where

- Worktree `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\ux-picks`, branch `ux-picks` (pushed to origin; never push it to master). `node_modules` is a junction to the main checkout's — unlink with PowerShell before ever removing the worktree.
- Preview: Vite dev server with HMR on 127.0.0.1:4460, served to the tailnet at `http://desktop-a0j72sv.tail2032db.ts.net:4460/bezeg-2.0/`. It runs under a watchdog loop `C:\Users\1337Hacker\Desktop\bezeg-ux-picks\keep-vite.ps1` (log `vite.log` beside it), launched detached. If the URL gives 502, check the loop and restart it with `Start-Process powershell.exe -ArgumentList '-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File C:\Users\1337Hacker\Desktop\bezeg-ux-picks\keep-vite.ps1' -WindowStyle Hidden`. `vite.config.mts` allows `.ts.net` hosts on this branch only.
- Last commit at handoff: see `git log -1`.

## Standing owner directions (verbatim where quoted)

- "we also, when we're adding a feature, we don't have to run all the tests. We just need to make sure that it works enough so I can see if I like it or not." → per pick: `npx tsc --noEmit --pretty false` plus a Playwright look on the preview; no unit or smoke suites.
- Prototypes must be addable and removable live: the "Prototipi" panel (bottom right) toggles each pick; `?ux=a,b` / `?ux=none` override.
- Prototypes should work across graphs generally, not only on one page; per-graph only where generic is unreliable ("if it is so, just choose like 3 lessons, one of them being the Taylor's polynomial").
- Owner is remote: always give tailnet URLs, never localhost.
- "the statements like 'graf gre vedno skozi...' should be removed" — no interpretive sentences on the a29 card.
- 2026-11-21 (handler 2): the owner wants all picks **except the ghost controls** implemented app-wide. Order: first polish the prototypes here (with the impeccable skill, `~/.claude/skills/impeccable/SKILL.md`, to critique and polish), then plan the app-wide implementation. Which picks count as "ghost controls" is still to be confirmed (asked: c11 ghost hand only, or also the a19/a29 ghost previews).
- Docked lesson: tools stay small only while the card is docked; a card carried away gives the tools the whole column. Hiding a docked card keeps its tab in the dock, not on the graph (pick dockTools).
- Legends: a separate legend card on the graph, built on the same shell as the text card (same pick, boardText).

## How picks are built

- Registry `src/uxPicks/picks.ts` (`PICKS`, `usePick(id)`, `pickOn(id)`); panel `src/uxPicks/UxPicksPanel.tsx`.
- Board-hosted picks mount in `UxBoardFrame` (`src/uxPicks/BoardLayer.tsx`), which wraps the JSXGraph box in `src/graphs/base/DemonstrationWorkspace.tsx`.
- Parameter registry `src/uxPicks/a1/paramRegistry.ts`: every `Slider` (kind `range`, `set`/`setRaw`) and `CountSetter` (kind `count`, `plus`/`minus`, root `data-param`) publishes itself; `asProbe`/`recentlyProbed` for previews that restore at once. Hooks live in `src/inputs/Slider.tsx` and `src/inputs/CountSetter.tsx`.
- Ghost capture shared by a19/a29: `src/uxPicks/a19/ghost.ts`.
- Prototype-only UI text is inline Slovenian, not catalog keys.
- Playwright: run node from the worktree with `require(process.cwd() + '/node_modules/playwright')`; in Git Bash pass URL paths without a leading slash; pucks sit below the fold at 1440×900, so scroll `.ux-board-frame` into view. Known harmless page error: "Unexpected token '<'" from `history-entry-bridge.js` (dev-server path doubling, pre-existing on master).

## Accepted picks (all committed and pushed on `ux-picks`)

| Pick | What | Commit |
|---|---|---|
| b1 Prehodi | lesson Back/Next morph the graph instead of jumping | 5674a11c |
| a1 Parametri na grafu | slider pucks on the board, extended to CountSetter counts | 6097c993 |
| a1 typed entry | double-click / Enter / start typing a number on a puck; out of range refused | a42de480 |
| a19 Poglej, preden skočiš | hover slider track → ghost; hover count −/+ → ghost one step | c4c26845 |
| a3 Parameter se premika sam | ∿ on puck: slider sweeps its range, count steps up/down | e891b963 |
| c11 Duh pokaže (+ b15) | idle ghost hand (8 s) and "Pokaži"/"Pokaži mi" on request; in lessons acts out the frame's named symbols | 937bbd98 |
| a29 Predogled na ploščici | puck track hover → ghost at that value, press jumps; elsewhere overview fan | 1b4309b7, 32d7dfe2 (statements removed) |
| boardText | graph's formula/readout text moved into a movable, collapsible MathJax card (11 graphs, semi-generic) | 4d9ca0fd, 3b1e77bf |
| boardText legend card | second card on the shared `BoardCard` shell: tools `FunctionLegend` (≈38 graphs, via `legendStore.ts`) and board-drawn legends marked with `markBoardLegend` (complex power, Euler circle, phase portrait, linear program, contours; their legend band is dropped while the pick is on) | e001d142 |
| dockTools | undocked task/closing card frees the tools column; hidden-from-dock tab sits in the dock | b05bea17 |

## Open items / known limits

- a29 overview for counts (Bernstein degree) finds no fan; card points to the −/+ previews instead.
- a3 sweeps a slider's whole range (e.g. c from −20 to 20); owner may want a narrower swing — offered, no answer yet.
- c11: not checked at 390 px or touch; lesson matching only sees MathJax-rendered symbols.
- boardText: bisection, mean value, convexity, arc length, inscribed angle, Lagrange not looked at with the new styling; one-letter Slovenian words may italicise; long names can overflow a narrow card; top-left readout rule could capture stray corner text on other graphs.
- Pucks not reviewed at phone width since the later picks were added.
- Legend card defaults to the top-left corner and can cover data there (e.g. z³ on complex power); position to be settled in the polish pass. Other board-drawn legends beyond the five graphs were not searched exhaustively.
- dockTools: two-column layouts only; not checked in presentation mode.

## Next steps

The owner chooses the next ideas from the lane tours (`C:\Users\1337Hacker\Desktop\bezeg-ux-challenge\SUMMARY.md`, lane-x/REPORT.md). Wait for the owner's next request; for each: port from the lane branch behind a new pick id (extend to counts and other controls where it makes sense, as the owner asked for a1/a19/a3), typecheck, look at it on the preview, commit to `ux-picks`, push the branch, report with the tailnet link.

## Settings

- Model Opus 5.5, effort high, permission mode auto. Delegate bounded ports to `bezeg-worker` with a brief (worktree path, pick conventions above, verify steps, 250-word report); handler reviews screenshots and commits.
- Handoff threshold for an Opus handler: 387k (AGENTS.md on master); the project hook still prints the older 215k figure.
- Successor rule: at handoff, write this note, commit and push it, then start your own successor with `claude --bg` from this worktree and pass this rule on.
