# Board workspace visual refinement (task 11): state

Present state only; rewritten in place at every boundary, under 8 KB. Launch brief: [`briefs/11-visual-lead.md`](briefs/11-visual-lead.md) (role, coordination, handoff command). Task: [`11-visual-refinement.md`](../../tasks/ux-picks-app-wide/11-visual-refinement.md). Lead 2 (2026-11-25) has seen the first pass in a browser, kept its cards, and is redesigning the pucks; two worker lanes are open. **Nothing of lead 2's is accepted or committed yet except this note and a merge of the base.**

## Where

- Branch `board-styling` on `origin`. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-styling`; `node_modules` is a junction (unlink with PowerShell before removing the worktree). Enter with `EnterWorktree` path, not a new name.
- The lock: lead 1 created the worktree by name, so it stayed locked to lead 1's session. The owner had lead 2 stop that session (`claude stop`; never `claude rm`, which removes the worktree). `git worktree list` still shows the stale lock line; entering works. A session that enters by path takes no lock, so a successor can enter while its predecessor lives.
- Sync and push: `git fetch origin`, `git merge origin/board-workspace-2` (the branch is published: never rebase), `git push origin board-styling`. Never force, never `master`, never publish. The stream's handler is now "Board workspace handler 9": merge requests and graph-side findings go there.
- Scope: `src/workspace/**` and shared input styles the pucks use. Not `src/graphs/**`, `src/learning/**`, `src/localization/**`, `scripts/`.
- Guards: only plain git commands (no `git -C`, no leading `cd`, no heredoc, no `$(...)` around git); write scripts and commit messages with Write (`.command-logs/lead2/`). Open few images, cropped; never re-read the prototype CSS.

## Servers (background shells of lead 2's session: they die with it)

- AFTER, Vite dev 4491: `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS=desktop-a0j72sv.tail2032db.ts.net npx vite --port 4491 --strictPort --host 127.0.0.1`. For the owner: `tailscale serve --bg --http=4491 http://127.0.0.1:4491`, URL `http://desktop-a0j72sv.tail2032db.ts.net:4491/bezeg-2.0/` (not served yet).
- BEFORE, frozen build of the base 4493: `SMOKE_PORT=4493 node .command-logs/11-before/scripts/serve-smoke-build.cjs` (on disk, gitignored; accepts the tailnet host).
- PROTOTYPE 4492 is stopped (`just --justfile <ux-picks wt>/justfile --working-directory <ux-picks wt> preview 4492` only if a new prototype shot is needed).

## Design (lead 2, after seeing prototype, before and first pass)

- Cards: the first pass is close to the prototype and stays: capitals in the head, quiet names, bold values at the right, hairlines between groups, short colour dashes.
- Pucks v2, "a readout row you can move" (`pucks/pucks.css`, head comment): row 1 is the name with its typeset symbol (quiet name, ink symbol in Georgia italics) and the bold value at the right; row 2 is the control over the full width (a 2 px track with a 10 px thumb; for a count − and + at the ends of a dotted scale; a switch; segments that wrap). About 58 px tall, 112 to 160 px wide. Sweep and "?" stay hidden until hover or focus and then cover the name's end; on a coarse pointer the buttons take the name's row and the value sits beside the control (lead 1's arrangement).
- How: `.puck` is a grid, the head is `display: contents`, each control element is a subgrid over the whole puck; a slider's focus ring is drawn on the slip with `:has()`.
- Contract (handler 8, 2026-11-25): with `symbol` set, `label` is the bare name and presenters typeset the symbol; puck labels aim at 16 characters. Handler 9 fixes Taylor's and phase portrait's labels. Until then `bareName()` in `pucks/puckSymbol.tsx` drops a label's trailing symbol.

## Lanes (Sonnet workers; neither accepted yet)

- Pucks markup: `pucks/puckSymbol.tsx` (`symbolParts`, `symbolText`, `spokenName`, `PuckSymbol`), `PuckFrame` takes `symbol` and wraps the name in `.puck-name`, the count puck has `.puck-scale` with `--puck-scale-steps`, `--puck-scale-index` and `data-dense`; 13 new tests. Follow-up running: `bareName`, a no-break space before the symbol, Unicode subscripts (`x₀`), fail-first for the pure functions. Report: `.command-logs/lead2/worker-pucks.md`.
- Cards: one readout group shows no fold title; Orodja opens on the first tab with content; the folded Legenda title cut; the reset button only when a place or fold is stored (always visible then, before the fold chevron); the tab-order test. Its `cards/toolsContent.ts` threw "Maximum update depth exceeded" once in `.command-logs/lead2/vite-4491.log`: check that it is gone. Report: `.command-logs/lead2/worker-cards.md`.
- Facts from the pucks worker: the strip is measured once per `puckShape` (`BoardCards.tsx:343-349`), no observer: a puck must have its final width at first paint (so symbols are not MathJax). `estimateStrip` is only the pre-measure guess.

## Next steps

1. Look at the v2 states in `.command-logs/shots/11/lead2-v2/` (`puck-hover`, `puck-focus`, `puck-entry`, `count-hover`, `strip-phase`, `strip-column`, `touch-strip`) and fix the CSS. Seen so far: `strip-default` only (light, close to the prototype).
2. Accept both lanes (diff against the briefs, observed failures, `just unit src/workspace`, `npx tsc --noEmit --pretty false`, `just lint <changed files>`); use `bareName` for the rows in `cards/ReadoutsBody.tsx:90`; commit in small commits; push.
3. Full AFTER capture: `node docs/reviews/ux-picks-app-wide/feel/11/states.cjs --base http://127.0.0.1:4491/bezeg-2.0 --out .command-logs/shots/11/states-after` and `bash docs/reviews/ux-picks-app-wide/feel/11/capture.sh after`; `bezeg-visual` (Sonnet) lists defects per scene; sheets `after-*.png` and `states-after-*.png` into `feel/11/` (composer `.command-logs/compose.cjs`).
4. Acceptance: after sheets beside before, 310 px card checks, contrast at least AA (ink-quiet on surface 6.5 : 1, on the highlight tint 5.6 : 1; track line 3.2 : 1), targets of 32 px on touch.
5. Owner preview: 4491 and 4493 on the tailnet, key sheets, the open questions. The task closes only on his word; then message handler 9 with the branch head.

## Evidence and selectors

- `feel/11/`: `capture.sh before|after` (10 scenes; notes `capture.md`), `states.cjs` (35 states; notes `states.md`), `capture-proto.sh`; committed sheets `before-*`, `states-before-*`, `proto-*`. Raw 1:1 crops on disk under `.command-logs/shots/11/{proto,before,states-before,states-after}/` (`states-after` is the first pass): open those, not the sheets.
- Board `.workspace-board-stage`, cards `#board-card-{readouts,legend,tools,lesson}` (never `[data-card-id]`: the hidden measure copy matches first), strip `[data-puck-strip]`.

## Findings that drive the design

- `.demonstration-workspace button` (`DemonstrationWorkspace.css:60`, `WorkspaceControls.css:2`) styles every button: rules carry `.board-card` / `.puck` / `.puck-strip` in front to out-rank it.
- Presentation re-binds the control tokens; `--board-*` roles bind only to shell roles, so slips stay light (state `board-presentation`: fine in the first pass).
- The measure copy has no live region: never style card bodies with `:last-child`; put separators on the following block.
- Couplings: "Več" bar 28 px (44 coarse) = `measureCards.ts:19`; strip gap 8 and column slot 160 = `boardLayout.ts`; grip 24 px = `PuckStrip.tsx:62`; `RULER_HEIGHT` 44; glide .26 s = `CardShell.tsx:62`.

## Open questions for the owner (ask at the preview, not before)

- Card titles as small capitals (the prototype's look) or in Literata.
- Pucks show "?" and sweep only on hover or focus; a card's reset arrow only after the card was moved or folded.
- Should Legenda start open when it fits (folded by default, `cardSpecs.tsx:75`)?
- Phase portrait's three-option "Sistem" puck is taller than the others even with wrapping segments; a dropdown would be a behaviour change.

## For handler 9 (not yet sent)

- `FunctionInverseGraph.tsx:369` declares the symbol as `x₀` (a Unicode subscript); `x_0` is the TeX form.
- Taylor still draws its text block on the board, repeating Odčitki and the legend (handler 8 listed it for the owner).
