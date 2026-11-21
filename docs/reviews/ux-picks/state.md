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
- 2026-11-21 (handler 2): the owner wants all picks **except the ghost controls** implemented app-wide. Order: first polish the prototypes here (with the impeccable skill, `~/.claude/skills/impeccable/SKILL.md`, to critique and polish), then plan the app-wide implementation. "Ghost controls" = c11 "Duh pokaže" (c11 + b15) only, confirmed and removed from the branch; a19 and a29 previews stay.
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
| ~~c11 Duh pokaže (+ b15)~~ | removed at the owner's request (2026-11-21); code was in 937bbd98 | removed |
| a29 Predogled na ploščici | puck track hover → ghost at that value, press jumps; elsewhere overview fan | 1b4309b7, 32d7dfe2 (statements removed) |
| boardText | graph's formula/readout text moved into a movable, collapsible MathJax card (11 graphs, semi-generic) | 4d9ca0fd, 3b1e77bf |
| boardText legend card | second card on the shared `BoardCard` shell: tools `FunctionLegend` (≈38 graphs, via `legendStore.ts`) and board-drawn legends marked with `markBoardLegend` (complex power, Euler circle, phase portrait, linear program, contours; their legend band is dropped while the pick is on) | e001d142 |
| dockTools | undocked task/closing card frees the tools column; hidden-from-dock tab sits in the dock | b05bea17 |

## Polish

Impeccable polish pass 1 done (efbebd3b, d616d449): findings, owner decisions, result and open items in `docs/reviews/ux-picks/polish-findings.md`. Board-hosted UI now goes through the dock host `src/uxPicks/dock/` (regions top-start, top-end, bottom, tray).

## Dock (after polish pass 1, owner-driven iteration)

- Commits: d7f1edfe (stacks, drop preview, Odčitki readout card via `src/uxPicks/boardText/BoardReadout.tsx`, ~30 graph files wrapped), 09bde461 (pucks lock note above the row), bea8babc (rows, lesson card docks in the graph, scroll clarity).
- Model: `src/uxPicks/dock/` — `dockLayout.ts` (regions with an axis: left/right columns, `top-row`, `bottom-row`, `bottom-end`; order; per-page storage `ux-dock-layout:<path>`; lesson placeholder in memory only), `dockMeasure.ts` (drop targets both axes, 48px), `dockFlip.ts` (200 ms ease-out glide, instant under reduced motion), `DockCard.tsx`, `BoardDock.tsx`, `useLessonDock.ts` (lesson card follows a placeholder; GuidedLesson is never remounted), `dock.css`.
- Owner rules for dragging (settled): pickup moves nothing; over a target, only cards a drop there would move glide to their final place; back over own slot or no target → pickup layout; outside all targets → floats and closes its gap. Columns grow to the free height of their side and scroll only past it (themed scrollbar + fade; "· se drsi" on the region label while dragging). Region labels Levo/Desno/Zgoraj/Spodaj/Spodaj desno in the preview. Phone: chips, one open; lesson card not graph-dockable on phone.
- Known flaws: with the left column empty, its preview slot and "Levo" label overlap a top-row card (preview only); Odčitki repeats an "Odčitki" heading on transformations; tall Odčitki (complex-euler) covers much of the board by default; not checked: keyboard moves of the lesson card in the graph, row scrolling label, bottom-end overflow.

## Next slice (owner approved 2026-11-21: "good plan")

1. Dock anchor refinement: a worker was running it at handoff time (brief: eight edge anchors top-left/top-centre/top-right/middle-left/middle-right/bottom-centre/bottom-right, pucks at bottom-left; quiet markers, one soft ghost for the target, labelled pill, central area floats with a "Prosto" hint; owner verdict "80% there, needs better positions (top-centre?) + nicer visuals; dislike 4 corners only"). Outputs in `C:/Users/1337Hacker/Desktop/bezeg-ux-picks/dock4/`. Review screenshots, commit, push.
2. New pick "Orodja kot kartica" (id e.g. `toolsCard`), a separate toggle so the owner can compare: the tools column becomes a dock card (head, fold, drag) and the graph can take the full width. Add side docks *beside* the graph (right, left, possibly below) that take layout space instead of overlaying; the tools card defaults to the right side dock so the page looks as today; folding it or dragging it onto the graph gives the graph the full width; other cards may use the side docks. The lesson card's home moves with the tools (the side dock). Phone: tools stay under the graph. Presentation mode needs its own check. Conflicts to record for the app-wide plan: DESIGN.md's fixed 310px inspector column and ADR 0061 (lesson card never on the board).
3. Then the app-wide implementation plan (spec in `docs/specs/`, tasks in `docs/tasks/`).

## Open items / known limits

- a29 overview for counts (Bernstein degree) finds no fan; card points to the −/+ previews instead.
- a3 sweeps a slider's whole range (e.g. c from −20 to 20); owner may want a narrower swing — offered, no answer yet.
- boardText: bisection, mean value, convexity, arc length, inscribed angle, Lagrange not looked at with the new styling; one-letter Slovenian words may italicise; long names can overflow a narrow card; top-left readout rule could capture stray corner text on other graphs.
- Pucks not reviewed at phone width since the later picks were added.
- Legend card defaults to the top-left corner and can cover data there (e.g. z³ on complex power); position to be settled in the polish pass. Other board-drawn legends beyond the five graphs were not searched exhaustively.
- dockTools: two-column layouts only; not checked in presentation mode.

## Next steps

The owner chooses the next ideas from the lane tours (`C:\Users\1337Hacker\Desktop\bezeg-ux-challenge\SUMMARY.md`, lane-x/REPORT.md). After polish, the owner wants a plan for implementing the kept picks app-wide (spec under `docs/specs/`, tasks under `docs/tasks/`). Wait for the owner's next request; for a new pick: port from the lane branch behind a new pick id (extend to counts and other controls where it makes sense, as the owner asked for a1/a19/a3), typecheck, look at it on the preview, commit to `ux-picks`, push the branch, report with the tailnet link.

## Settings

- Model Opus 5.5, effort high, permission mode auto. Delegate bounded ports to `bezeg-worker` with a brief (worktree path, pick conventions above, verify steps, 250-word report); handler reviews screenshots and commits.
- Handoff threshold for an Opus handler: 387k (AGENTS.md on master); the project hook still prints the older 215k figure.
- Successor rule: at handoff, write this note, commit and push it, then start your own successor with `claude --bg` from this worktree and pass this rule on.
