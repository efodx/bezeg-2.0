# Board workspace visual refinement (task 11): state

Present state only; rewritten in place at every boundary, under 8 KB. Launch brief: [`briefs/11-visual-lead.md`](briefs/11-visual-lead.md) (role, coordination, handoff command). Task: [`11-visual-refinement.md`](../../tasks/ux-picks-app-wide/11-visual-refinement.md). Lead 1 handed off at the budget line on 2026-11-25 right after writing the first styling pass: **nobody has looked at that pass in a browser yet.**

## Where

- Branch `board-styling` (from `origin/board-workspace-2` `97321d4d4`), pushed to `origin/board-styling`. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-styling`; `node_modules` is a junction (unlink with PowerShell before removing the worktree). Enter it with `EnterWorktree` path, not a new name.
- Push: `git fetch origin`, rebase on `origin/board-workspace-2`, `git push origin board-styling`. Never force, never `master`, never publish.
- Scope: `src/workspace/**` and shared input styles the pucks use. Not `src/graphs/**`, `src/learning/**`, `scripts/`.
- The worktree guard refuses `git -C <other worktree>` and a leading `cd`. Budget lesson: lead 1 spent its context on reading the prototype's CSS and on images. Do not re-read the prototype CSS; open few images, cropped.

## Servers (lead 1's shells died with its session: start them again)

- AFTER, Vite dev 4491: `npx vite --port 4491 --strictPort --host 127.0.0.1` in the background. It answers 403 to the tailnet host: for the owner start it with `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=desktop-a0j72sv.tail2032db.ts.net` set, then `tailscale serve --bg --http=4491 http://127.0.0.1:4491`. Owner URL `http://desktop-a0j72sv.tail2032db.ts.net:4491/bezeg-2.0/`.
- BEFORE, frozen build of the base 4493: `SMOKE_PORT=4493 node .command-logs/11-before/scripts/serve-smoke-build.cjs` (folder is on disk, gitignored; accepts the tailnet host, so it can be served to the owner beside 4491).
- PROTOTYPE 4492 (only if a new prototype shot is needed): `just --justfile <ux-picks wt>/justfile --working-directory <ux-picks wt> preview 4492`. Never a Vite dev server there.

## Evidence in `feel/11/` (acceptance 1 and 2, BEFORE side done)

- Static: `capture.sh before|after` (10 scenes, boards at 1440 and 1280, card crops, 310 px), notes `capture.md`; sheets `before-*.png`. Prototype: `capture-proto.sh`, `capture-proto.md`, `proto-*.png`.
- Interactive: `states.cjs` (35 named states: hover, focus, drag, lesson highlight, Presentation, touch, column dock), notes `states.md`; sheets `states-before-*.png`. AFTER: `node docs/reviews/ux-picks-app-wide/feel/11/states.cjs --base http://127.0.0.1:4491/bezeg-2.0 --out .command-logs/shots/11/states-after [--only <name>]`.
- Selectors: board `.workspace-board-stage`, cards `#board-card-{readouts,legend,tools,lesson}` (never `[data-card-id]`: the hidden measure copy matches first), strip `[data-puck-strip]`.

## Findings that drive the design

- `.demonstration-workspace button` (`DemonstrationWorkspace.css:60`, `WorkspaceControls.css:2`, 44 px on coarse) gave every card and puck button a border, 34 px height and padding. New rules carry `.board-card` / `.puck` / `.puck-strip` in front to out-rank it.
- Presentation: puck text was cream on cream (pucks read `--bezeg-control-ink`, which Presentation re-binds). New tokens bind only to shell roles, so slips stay light. Check state `board-presentation`.
- Swatch rows had the value 4 px above the name (the mark gave the baseline). Long values ran past the card (`nowrap`). Puck labels were cut ("Matrika A: a (vrsti…").
- The measure copy has no live region: never style card bodies with `:last-child`; put separators on the following block.
- Couplings to keep: "Več" bar 28 px (44 coarse) = `measureCards.ts:19`; strip gap 8 and column slot 160 = `boardLayout.ts`; grip 24 px = `PuckStrip.tsx:62`; `RULER_HEIGHT` 44; glide .26 s = `CardShell.tsx:62`.

## First styling pass (committed, unverified by eye)

- `src/workspace/boardTokens.css` (new, `--board-*` roles on each component root), `cards/CardShell.css`, `cards/cards.css`, `cards/tools.css`, `pucks/pucks.css` rewritten.
- Cards: 12 px radius, short two-layer shadow, 34 px head (44 coarse), title as tracked capitals (section cards keep case), 28 px ghost buttons, head rule only on cut cards and Orodja, reset button hidden until the card is hovered or focused, "Več" bar with a chevron. Rows: quiet name, value 600 at the right, hairlines between groups, group title with a drawn chevron, lesson highlight = `--board-mark` tint + 3 px ochre bar, muted rows without opacity, values may wrap.
- Pucks: caption row (name, up to two lines, sweep and "?" as 20 px circles) over the control row (track then value at the right; 2 px line, accent fill, round thumb), round steppers with drawn signs, segments in a well, light tooltip and help card, dark undo pill, paper grip.
- Markup: `CardShell.tsx` reset button has class `board-card-reset` and now comes before the fold button; `RangePuck.tsx` has a `.puck-thumb` span in both tracks.
- Checks at handoff: `npx tsc --noEmit --pretty false` clean, `just lint src/workspace` clean, `just unit src/workspace` 419 of 420: `CardShell.test.tsx` "renders head actions between title and fold/reset, in tab order" fails because of the reset/fold swap. Decide: keep the swap and update that test with one line of reason, or put reset back after fold (then the hidden reset leaves a gap right of the chevron).

## Next steps

1. Start 4491 and 4493. Run the AFTER states and `bash docs/reviews/ux-picks-app-wide/feel/11/capture.sh after`; have `bezeg-visual` (Sonnet) list defects per scene; look yourself at `card-readouts`, `strip-default`, `strip-phase`, `card-lesson`, `board-presentation`, `touch-strip`. Expect to iterate on the CSS.
2. Cards lane (worker, `src/workspace/cards/**`, `presenter/**`): a single readout group shows no title and is never folded by `planGroupFolds` (`ReadoutsBody.tsx:149,170`); Orodja opens on the first non-empty tab (exponential: its only control is in Prikaz; panels can be emptied by `[data-declared-panel]`); find why a folded Legenda title is cut ("Lege…"); show the reset button only when the card has a stored place or fold (attribute from `BoardCards.tsx`); fix the tab-order test.
3. Pucks lane (worker, `src/workspace/pucks/**`): tests for the thumb; check the strip estimate `PuckStrip.tsx:62` against the new sizes; count puck at min, locked puck, notice.
4. Acceptance: after sheets beside before, 310 px card checks, `just unit src/workspace`, tsc, `just lint <changed files>`; contrast of text at least AA (ink-quiet on surface 6.5 : 1, on the highlight tint 5.6 : 1; track line 3.2 : 1).
5. Owner preview: 4491 (after) and 4493 (before) on the tailnet, key sheets, the open questions below. The task closes only on his word; then message the main handler with the branch head.

## Open questions for the owner (ask at the preview, not before)

- Card titles as small capitals (the prototype's look) or in Literata.
- Reset arrow hidden until hover.
- Should Legenda start open when it fits (it is folded by default, `cardSpecs.tsx:75`)? The layout already folds it first under pressure.

## For the main handler (not yet sent: message that session)

- Taylor's readout rows show the symbol twice ("Središče c c"): `taylor_center_label` holds "Središče c" and the row also passes `symbol` (`TaylorGraph.tsx:401-403`). The same pattern will spread in the 08 lanes; the guide should say whether a label holds its symbol.
- Taylor still draws its text block on the board, repeating Odčitki and the legend.
- Phase portrait's "Sistem" choice puck stacks three segments and makes the strip two rows tall; labels such as "Matrika A: a (vrstica 1, stolpec 1)" need two lines in a puck.
