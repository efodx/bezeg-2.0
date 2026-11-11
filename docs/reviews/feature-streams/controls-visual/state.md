# Controls visual stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [stream file](../../../tasks/feature-streams/controls-visual.md) and the [spec](../../../specs/control-visual-polish.md) (sections Acceptance criteria, Tokens, Decisions).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-visual`, `worktree-stream-visual`, own `npm ci`. Run state: **active**. Stream port 4327 for previews of this worktree's `build/` (the Vite output dir is `build/`, not `dist/`); 4322 for a "before" preview of master from the clean worktree (both previews were stopped at handoff; restart with `just preview <port>` after `just build`); `just controls-fixture` uses 4328.
- **Clean worktree for publishing:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached. Recipe: `git fetch -q origin && git checkout -q --detach origin/master && git cherry-pick <stream commits>`, then `just publish --background --recipe runtime --base <origin/master sha> --commits <ids, oldest first>`; `just publish --status`; then `just ci <pushed sha>`. Browser smoke is run from the stream worktree against 4327 before publishing.
- **Branch updates:** `git merge origin/master`, never rebase. Conflicts in files that master holds only as cherry-picked copies resolve to the stream side (`git checkout --ours`) after `git log <merge-base>..origin/master -- <file>` shows only our own commits.
- **Owner directions:** handlers decide and record, with no confirmation. Launch successors with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium` at budget handoff, passing this rule on; end without a successor when no actionable work is left.

## Done (handler 1, 2026-11-11)

- **Step 1 audit:** [audit.md](audit.md), 122 routes × three views on master `bf843c25`. Scripts and measurements: clean worktree `.command-logs/cv-audit/` (`run.cjs`, `agg.cjs`, `pres-text.cjs`, `measurements.json`).
- **Step 2:** spec criteria and tokens finalised, DESIGN.md "Graph controls" section, `src/inputs/controlTokens.css`; shared buttons, groups, fields, selects, curve picker, modes, playback, focus ring and Presentation colours on the tokens; pressed/selected states and inspector tabs on the selected tokens. Published as master `396e0935` (check `just publish --status`; stream commit `fe0f0d3d`). After-measurement of all 122 routes: stream `.command-logs/cv-proto-all/summary.md`.
- **Step 5 slices 1–2:** net −10 tests, helpers `src/graphs/base/selectedPointKeyBehaviour.tsx`, `resetAvailabilityBehaviour.ts`, `unavailableFocusBehaviour.ts`, `src/graphs/projective/projectiveInspectorBehaviour.tsx`. Published (`81963a73`, `83cc0fe4`).
- Master browser smoke was red from families-prep `219ec048` (catalogue order, counting-tree smoke); the families-prep handler took the fix.

- **Step 3a** (stream `04a229da`): checkbox 20 × 20, switch 36 × 20, slider track and thumb on the tokens; disabled boolean is a dashed border, not yet seen in a browser (no route has one). Range thumb fill goes through `--range-thumb-bg` read by the global rule in `src/bootstrap-overrides.scss`.
- **Step 5 slice 3** (stream `ed4e9d00`): hit-zone group, net −8 tests, helper `src/graphs/base/handleHitZoneBehaviour.ts`. Total so far net −18.

## Not yet published (handler 1 stopped at BUDGET SOFT)

- Prototype publish `publish-396e0935-58adff` was still pending at handoff: check `just publish --status` in the clean worktree; if it failed, read its log and republish `fe0f0d3d`. Then `just ci <sha>`.
- Then cherry-pick and publish, oldest first: `e9d2eff5` (docs), `ed4e9d00` (tests), `04a229da` (3a CSS), plus this state commit. 3a was smoked by its worker on six routes and passed `just controls-fixture`; no further smoke needed before publishing.

## Next

1. **Step 3b:** count setters (`CountSetter.css`, 47 px → token on desktop, 44 on touch), `.point-collection .btn` fixed 44 px (`PointCollection.css:5`), disclosures (`summary` 24 px on `/analysis/fourier-coefficients`), `pointset-remove` 31–32 × 44 on `/compgeo/interval-sweep`, select chevron dark on navy in Presentation, the transparent "Strni" ghost button, disabled look not by opacity alone (`.btn` aria-disabled, `.inspector-playback`).
2. **Step 3c:** per-graph overrides: `src/graphs/functions/FunctionReadout.css:46-97` action buttons (2 px, 1.48 : 1, 28 routes), `PascalControls.css:3`, `affine-action-button`, list-row buttons still under 3 : 1 (`control-row`, `value-list-row`, `zero-list-row`, `convexity-actions`; list in `cv-proto-all/summary.txt`); Presentation text residuals: caption "Obsegi parametra t" on `/bezier/clipping`, `p.form-text` on `/isometries`, h4 "Animacija konstrukcije" on `/bezier/decasteljau*` and `/rational/rational-decasteljau`; no focus ring on "Premakni" and "Za ta način izberi krivuljo." (`/bezier/curve`, `/curve-geometry/curvature`).
3. **Step 4** carried controls items (stream file), independent of styling.
4. **Step 5** next: the unassessed areas in the inventory (appearance contracts, 195 unmount/dispose and 84 language-switch tests in `src/graphs`).
5. Close-out of step 3: rerun the audit script on all routes (Haiku smoke, `cv-proto-all` pattern) and criterion 4 views via `just controls-fixture`.

## Risks and working notes

- Look at before/after screenshots yourself: numeric checks missed a lost selected-button fill (worker measured Presentation text only). Ask for both themes and pressed states.
- A new shared rule at (0,2,0)+ outranks Bootstrap and component state rules; check pressed, active, disabled and hover after each slice.
- `--bezeg-*` palette variables are not on `:root`; tokens use literals.
- `just controls-fixture` takes about 10 minutes and caught a select clip from a font change; run it for any change to fonts, padding or widths.
- Haiku smoke cannot Write its summary file (tool refuses); ask for the summary in the return text or written by a script.
- The controls stream's [state note](../controls/state.md#risks-and-working-notes) has more Playwright patterns.
- CSS-source tests do not prove the cascade; measure in a browser.
- Line endings: many files have CRLF working copies; edit by hand rather than with `\s*` regexes.
