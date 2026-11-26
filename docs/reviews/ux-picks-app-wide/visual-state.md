# Board workspace visual refinement (task 11): state

Present state only; rewritten in place at every boundary, under 8 KB. Launch brief: [`briefs/11-visual-lead.md`](briefs/11-visual-lead.md) (role, coordination, handoff command). Task: [`11-visual-refinement.md`](../../tasks/ux-picks-app-wide/11-visual-refinement.md). Lead 4 (Opus, 2026-11-26) judged the new desktop pucks over 18 states, fixed what showed, merged `origin/master` (the x0 fix), widened Orodja to its 310 px panels, let readout names wrap beside short values, committed the AFTER sheets and asked the owner for sign-off on the tailnet preview (waiting). **Owner, 2026-11-26: successors run on Opus at high effort** (budget 315k soft, 387k handoff).

## Where

- Branch `board-styling` on `origin`. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-styling`; `node_modules` is a junction (unlink with PowerShell before removing the worktree). Enter with `EnterWorktree` path, never a new name.
- Sync and push: `git fetch origin`, merge `origin/board-workspace-2` (or `origin/master` when handler 9's commits are there first; never rebase), `git push origin board-styling`. Never force, never `master`, never publish. Stream handler: "Board workspace handler 9".
- Scope: `src/workspace/**` and shared input styles the pucks use. Not `src/graphs/**`, `src/learning/**`, `src/localization/**`, `scripts/` without handler 9's word.
- Guards: plain git commands only (no `git -C`, no leading `cd`, no `$(...)`). Scripts and commit messages with Write (`.command-logs/lead4/`). A `\u` escape typed into Edit or Write arrives as the raw character: write such text with a node script (`.command-logs/lead3/nbsp.cjs`).

## Servers (stopped at handoff: start them again)

- AFTER, Vite dev 4491: `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=desktop-a0j72sv.tail2032db.ts.net npx vite --port 4491 --strictPort --host 127.0.0.1 > .command-logs/<you>/vite-4491.log 2>&1`. For the owner: `tailscale serve --bg --http=4491 http://127.0.0.1:4491`, URL `http://desktop-a0j72sv.tail2032db.ts.net:4491/bezeg-2.0/` (served by lead 4; 4493 likewise; the serve entries stay, only the servers behind them stop).
- BEFORE, frozen build 4493: `SMOKE_PORT=4493 node .command-logs/11-before/scripts/serve-smoke-build.cjs`.
- On Windows a stopped background shell leaves its node tree alive. If a port is taken, find the owner (`Get-NetTCPConnection -LocalPort 4491`), confirm by command line that it is this worktree's server, and stop that tree.

## Design

- Cards: lead 1's pass stays (capitals in the head, quiet names, bold values, hairlines, colour dashes). One readout group has no fold title; Orodja shows only tabs with content and opens on the first; the reset arrow exists only while a place or fold is stored.
- Pucks with a mouse (`pucks.css`, the `(hover: hover) and (pointer: fine)` block): a readout row over its control. Name and symbol left, value right at 14 px; under them the control over the full width (track; − scale +). A switch sits beside its name; a choice's segments take row 2. Slips 112 to 200 px (choice up to 260 so its segments keep one row), at least 56 px tall. Sweep and "?" ride the top edge on hover or focus, hide while the slider is held and during a typed entry.
- Messages over a slip: tip, help card, undo pill and the entry's refusal all stand above the slip (the strip docks at the board's foot, where the nudge bar covered a notice below it); a pill or notice hides the tip.
- In a strip with Play and reset, slips keep their own height instead of stretching to the buttons' foot.
- A count's DOM order is value, −, + (tab order follows the desktop look; touch CSS orders − value +).
- Orodja is a live card read at its content's shrink width; `BoardCards.tsx` floors its natural width at `TOOLS_NATURAL.w` 310 (column cap 0.32 still applies).
- Readout rows: `.ws-name { flex: 1 1 0; min-width: min-content }`: a long name wraps beside a short value; a value that does not fit beside the name's longest word takes the next line. (An 8em basis broke narrow cards: exponential at 1280.)
- Touch: lead 2's caption over the control, unchanged.
- Names: a puck with a symbol is named "name symbol" for assistive technology (`spokenName`); function-inverse now reads "Abscisa točke P x₀" (master `fba5c86d7`, merged).

## Done (pushed)

Lead 3: `210823404` … `fb985f062` (cards, Orodja tabs, reset focus, repeated symbol, value reserve, desktop pucks). Lead 4: `4e761e956` whole names, one-row choices, notices above the slip, count tab order; merge of `origin/master` 23b52b97b; `44b7e923e` 56 px slips; `97443558e` Orodja 310 px (worker, test "Orodja's width > is at least 310 px…"); `b5acb5e72`, `6fa499459` readout names wrap beside short values, AFTER sheets; merges of `origin/board-workspace-2` (b7ebb428e: L38, L40, L46, Taylor and phase portrait readouts); `7fb537387` no card narrower than 248 px (`CARD_MIN_WIDTH`, a folded Orodja head; bezier-clipping's "Lege…" and title-less Orodja). Handler 9's root-finding items (truncated "Drugi začetek", pale "Sekanta") do not occur on this branch. `just unit src/workspace`, tsc, lint pass. Acceptance done: `bezeg-visual` judged before/after pairs (AFTER better on every pair; remaining overlaps are layout or graph-side and were there before), clip check passes at 1440x900 and 1280x720, no colour changes since the AA checks, touch rules unchanged. The w310 sheets are as tiny before as after (a 310 px viewport, a phone layout: task 09).

## Next steps

1. Waiting for the owner's answers (asked with AskUserQuestion; questions below). On his word: apply any change he asks for, recapture the touched sets, push, and message handler 9 with the branch head to merge. If he signs off as is: message handler 9 now.
2. Composer for AFTER state sheets: `node .command-logs/compose-after.cjs` (from `.command-logs/lead4/make-compose.cjs`).

## Evidence and selectors

- `feel/11/`: `capture.sh before|after` (10 scenes; `capture.md`), `states.cjs` (36 states; `states.md`), committed sheets `before-*`, `states-before-*`, `proto-*`. Puck-only recapture: `bash .command-logs/lead3/pucks-shots.sh <out> <tag> [filters]`.
- Board `.workspace-board-stage`, cards `#board-card-{readouts,legend,tools,lesson}` (never `[data-card-id]`), strip `[data-puck-strip]`.

## Findings that drive the design

- `.demonstration-workspace button:hover` sets `background` as a whole at weight (0,2,1): every background longhand a puck or card button relies on needs a heavier selector.
- The strip is measured once per puck shape: a puck must have its final size at first paint. `estimateStrip` (`PuckStrip.tsx:62`) is only a placeholder before that.
- The measure copy is first read at max-content; it has no live region: never style card bodies with `:last-child`.
- Couplings: "Več" bar 28 px (44 coarse) = `measureCards.ts:19`; strip gap 8 and column slot 160 = `boardLayout.ts`; grip 24 px; `RULER_HEIGHT` 44; glide .26 s = `CardShell.tsx:62`.

## Owner decisions (2026-11-26, AskUserQuestion)

- Desktop pucks: readout row over a full-width control (kept). Card titles: small capitals (kept).
- Legenda starts open where it fits: done in `4323d1876` (`defaultFolded` dropped; new layout rule 5b `reopenWhenRoom` reopens it when later folds left room; 03-layout-design and 04-design updated). Open at 1440 on Taylor, transformations, linear map, phase portrait, polygon area, clipping; folded where Orodja fills the column and at 1280 on most boards. Tell handler 9 at the merge.
- **Signed off (owner, 2026-11-26)** on the screenshots shown in the conversation ("Much better", then sign-off with Legenda open). Task 11 is closed; branch head `311a7a61c` + this note sent to handler 9 to merge. Servers stopped, tailnet serves for 4491 and 4493 turned off. No successor lead is needed.

## With handler 9

- Queued on its side after lane L38: Taylor's Polinom/Funkcija rows as bare name plus symbol; phase portrait's short readout values. He will say when they land.
- His to ask the owner: removing Taylor's board-drawn text block, and the strip covering board-drawn text (phase portrait).
