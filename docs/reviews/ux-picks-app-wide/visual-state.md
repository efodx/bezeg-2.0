# Board workspace visual refinement (task 11): state

Present state only; rewritten in place at every boundary, under 8 KB. Launch brief: [`briefs/11-visual-lead.md`](briefs/11-visual-lead.md) (role, coordination, handoff command). Task: [`11-visual-refinement.md`](../../tasks/ux-picks-app-wide/11-visual-refinement.md). Lead 3 (2026-11-26) accepted both lanes with fixes, merged the label/symbol rule, had the clipped Odčitki card fixed, and redesigned the desktop pucks, seen on two shots only. **Owner, 2026-11-26: successors run on Opus at high effort** (budget 315k soft, 387k handoff).

## Where

- Branch `board-styling` on `origin`. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-styling`; `node_modules` is a junction (unlink with PowerShell before removing the worktree). Enter with `EnterWorktree` path, never a new name.
- Sync and push: `git fetch origin`, `git merge origin/board-workspace-2` (published branch: never rebase), `git push origin board-styling`. Never force, never `master`, never publish. Stream handler: "Board workspace handler 9".
- Scope: `src/workspace/**` and shared input styles the pucks use. Not `src/graphs/**`, `src/learning/**`, `src/localization/**`, `scripts/` without handler 9's word.
- Guards: plain git commands only (no `git -C`, no leading `cd`, no heredoc, no `$(...)`; a command mixing git with `sed` escapes is refused). Scripts and commit messages with Write (`.command-logs/lead3/`). A `\u` escape typed into Edit or Write arrives as the raw character: write such text with a node script (`.command-logs/lead3/nbsp.cjs`).

## Servers (stopped at handoff: start them again)

- AFTER, Vite dev 4491: `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=desktop-a0j72sv.tail2032db.ts.net npx vite --port 4491 --strictPort --host 127.0.0.1 > .command-logs/<you>/vite-4491.log 2>&1`. For the owner: `tailscale serve --bg --http=4491 http://127.0.0.1:4491`, URL `http://desktop-a0j72sv.tail2032db.ts.net:4491/bezeg-2.0/` (not served yet).
- BEFORE, frozen build 4493: `SMOKE_PORT=4493 node .command-logs/11-before/scripts/serve-smoke-build.cjs`.
- On Windows a stopped background shell leaves its node tree alive. If a port is taken, find the owner (`Get-NetTCPConnection -LocalPort 4491`), confirm by command line that it is this worktree's server, and stop that tree. A predecessor's leftover is swept about 15 minutes after its session ends, so never reuse one.

## Design

- Cards: lead 1's pass stays (capitals in the head, quiet names, bold values, hairlines, colour dashes). One readout group has no fold title; Orodja shows only tabs with content and opens on the first; the reset arrow exists only while a place or fold is stored.
- Pucks with a mouse (`pucks.css`, the `(hover: hover) and (pointer: fine)` block before the touch block): a readout row over its control. Name and symbol left, value right at 14 px like a card's value; under them the control over the full width (track; − scale +). A switch sits beside its name; a choice's segments take row 2. `.puck` is a two-column grid, the head is `display: contents`, the control spans the slip as a subgrid, so a drag may start anywhere on the slip. About 56 px tall. Sweep and "?" ride the top edge on hover or focus and hide while the slider is held.
- Touch: lead 2's caption over the control, unchanged (the base rules).
- The alternative lead 2 left (caption over control on desktop too, track about 40 px) is in `.command-logs/shots/11/states-l3a/`; removing the media block restores it.
- Names: a puck with a symbol is named "name symbol" for assistive technology (`spokenName`). Handler 9 agreed (its answer A) and let this branch update seven expectations in its tests (`0cfc3b618`). Coming on `board-workspace-2`: function-inverse's x0 as "Abscisa točke P" with symbol `x_0`; if its tests assert a bare name after the merge, the same rule applies.

## Done by lead 3 (pushed)

`210823404` merge of `074d5d6cf`; `15ed87d2b` Orodja tabs read in place, the lesson's tab is kept; `8f1bf539b` focus goes to the fold button after a reset; `685a8d452` readout rows show a repeated symbol once; `0cfc3b618` the seven expectations; then the value reserve fix (clipped Odčitki on phase portrait, worker), the desktop pucks WIP and this note. `just unit src/workspace`, tsc and lint pass. No "Maximum update depth" in a fresh Vite log over 36 states.

## Next steps

1. Start the servers. Capture the puck and strip states: `bash .command-logs/lead3/pucks-shots.sh .command-logs/shots/11/<folder> <tag>` (filters default to strip, puck, count; pass `touch` too). Seen and good: `strip-default`, `count-hover` in `states-l3c`. Have `bezeg-visual` (Sonnet) judge the rest and open the key ones: phase portrait's strip (names that wrap, the three-option Sistem), column dock, focus ring, typed entry (the input must sit in the value's place without changing the slip's size), drag ruler (now above the whole slip), undo pill, sweep, help card, and touch equal to `states-l3a`.
2. Fix what shows. Known candidates: `estimateStrip` guesses 64 px of height (`PuckStrip.tsx:62`); a count puck's tab order is −, value, + while the value now sits top right.
3. Full AFTER capture: `node docs/reviews/ux-picks-app-wide/feel/11/states.cjs --base http://127.0.0.1:4491/bezeg-2.0 --out .command-logs/shots/11/states-after`, then `bash docs/reviews/ux-picks-app-wide/feel/11/capture.sh after`; sheets `after-*.png` and `states-after-*.png` into `feel/11/` (composer `.command-logs/compose.cjs`, set its `dir`). `just shot` dies now and then with "newPage: Target crashed" when the machine is busy: `capture.sh` goes on with the next set, so rerun the set that failed. Card crops FAIL where a scene lacks the card (expected). The untracked `after-*.png` in `feel/11/` are stale.
4. Acceptance: after sheets beside before, 310 px card checks, contrast at least AA (ink-quiet on surface 6.5 : 1; track line 3.2 : 1), targets of 32 px on touch, `.command-logs/lead3/clip-check.cjs <base> <WxH> <routes...>` passes.
5. Owner preview: 4491 and 4493 on the tailnet, key sheets, the open questions. The task closes only on his word; then message handler 9 with the branch head.

## Evidence and selectors

- `feel/11/`: `capture.sh before|after` (10 scenes; `capture.md`), `states.cjs` (36 states, 10 to 35 s each; `states.md`), committed sheets `before-*`, `states-before-*`, `proto-*`. Raw 1:1 crops under `.command-logs/shots/11/`: `proto`, `before`, `states-before`, `states-l3b` (all 36 states before the puck redesign), `after` (boards at 1440 and 1280 before it), `states-l3c` (the new pucks).
- Board `.workspace-board-stage`, cards `#board-card-{readouts,legend,tools,lesson}` (never `[data-card-id]`), strip `[data-puck-strip]`.

## Findings that drive the design

- `.demonstration-workspace button:hover` sets `background` as a whole at weight (0,2,1): every background longhand a puck or card button relies on needs a heavier selector, or a hover resets it.
- The strip is measured once per puck shape: a puck must have its final width at first paint (symbols are typeset without MathJax).
- The measure copy is first read at max-content: nothing may keep a width from that reading (`--ws-reserved` is bounded by the row).
- The measure copy has no live region: never style card bodies with `:last-child`.
- Couplings: "Več" bar 28 px (44 coarse) = `measureCards.ts:19`; strip gap 8 and column slot 160 = `boardLayout.ts`; grip 24 px = `PuckStrip.tsx:62`; `RULER_HEIGHT` 44; glide .26 s = `CardShell.tsx:62`.

## Open questions for the owner (ask at the preview, not before)

- Desktop pucks as a readout row over a full-width control (now), or lead 2's caption over the control.
- Card titles as small capitals (the prototype's look) or in Literata.
- Pucks show "?" and sweep only on hover or focus; a card's reset arrow only after the card was moved or folded.
- Should Legenda start open when it fits (folded by default, `cardSpecs.tsx:75`)?
- Phase portrait's three-option "Sistem" puck is taller than the others; a dropdown would be a behaviour change.

## For handler 9

- Sent and acknowledged: Orodja shows only tabs with content; the reset arrow is rendered only while something is stored.
- Not yet sent: Taylor still draws its text block on the board, repeating Odčitki and the legend. Taylor's rows "Polinom Tₙ(x)", "Funkcija f(x)" carry their formula as plain text in the name; a name plus `symbol` would typeset it like the first three rows. Phase portrait's readout values are whole sentences ("x od −4 do 4 … Trajektorije se ustavijo na robu."), which makes the card long and cut. Its strip covers the board's own text at the bottom left.
