# Control choice: handler state note

Rewritten by each handler at its handoff. Written by handler 1 on 2026-11-14 at its soft budget. Queue and status: [task queue](../../tasks/control-choice/README.md). Spec: [control choice and composition](../../specs/control-choice-and-composition.md). Catalogue: [docs/controls.md](../../controls.md).

## Standing owner direction (2026-11-14)

- "I want you to plan on how we'll find more such controls and fix them - we want to remove redundant controls."
- "you're a design master, you chose instead of me." Design decisions are the handler's; record them in the spec.
- Prevention "sounds too complicated": the catalogue file is the main measure; keep gates light.
- "simply continue this whole thing we planned without questioning me at all, spawn Fable 5.2 successor as per repo rule, if you see some task is going slower than expected, you can tweak the plan as well."

So: never stop to ask. Decide, record, continue. Each handler launches its successor (`claude --bg -n "control-choice handler <n+1>" --agent bezeg-handler --model claude-fable-5-2 --permission-mode auto "<prompt>"`, from this worktree) and passes this rule on. Stop only when the queue is complete or for a README stop condition.

## Where things are

- Worktree `.claude/worktrees/stream-control-choice`, branch `worktree-stream-control-choice`, own `npm ci`. Also pushed to `origin` as a branch for safekeeping (not master).
- Local commits, oldest first, on top of `origin/master` `12815c5f`:
  1. `66508921` point rows on one line; editing-mode box edge; fixture composition check.
  2. `1ac55559` catalogue, inventory script and table, queue, this note.
  3. `7cce5468` sweep script.
  4. `7ad886af` Descent sliders and track point list (worker 2b).
  5. `aecf4295` Kinematics sliders (worker 2b).
  6. `22f6ebb3` new-point entry alignment, editing-mode chevron, board tools list.
  7. `ed06f50a` compgeo panels (worker 2a).
  8. `866c5d74` point row `bigStep`, circle centres keep PageUp 4, pilot notes.
  9. this note.
- **Publish state.** Commit 1 is in a background publish gate started as `45abbb11` (its sha before a rebase): `just publish --status` shows `publish-45abbb11-0e4888`. It was still running its changed-unit-test step at 03:25 on a busy machine. Nothing else is published.

## First actions for the successor

1. `just publish --status`. Wait until `publish-45abbb11-0e4888` is `ok` (do not sleep in a loop: run one background command that waits for `.command-logs/publish-45abbb11-0e4888.json` to exist, and continue when it notifies). If it failed, read its log, fix, and include commit 1 in the next publish.
2. `git fetch origin`, then `git rebase origin/master` (commit 1 drops out as already applied). Resolve mechanical conflicts by keeping both sides; `sl.ts`/`en.ts` are the likely place.
3. `just typecheck`, then publish the remaining commits in one gate: `just publish --background --recipe runtime --base <origin/master sha> --commits <sha,...oldest first>`. Continue with the queue while it runs; check `--status` before calling it published.
4. Start a dev server for screenshots: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4324 --strictPort` in the background.

## Accepted work and how it was checked

- Step 0a/0b and the pilots were reviewed on screenshots by the handler (Inversion, Circle constructions, Descent race/track/tautochrone, Kinematics, curve workspace). `just typecheck` passed at `ed06f50a` plus the commit-8 edits; `just controls-fixture` passed with commits 1 and 6; focused `just unit` runs passed for inputs, the curve workspace, compgeo and the two pilot families. The full gate (changed unit tests, build, smoke) runs at publish.
- Inventory: 146 typed number fields at the start, 133 after the pilots, 131 still undecided (`node scripts/controls-inventory.cjs --check`).

## Remaining steps, in order

1. Slices 2c–2h of the queue (functions in three slices, complex/isometry/level sets, combinatorics/random/recursion/B-spline, and the small graphs left from 2b). Two workers at a time, `bezeg-worker`, Sonnet `medium`.
2. Step 3, the sweep: `node scripts/controls-sweep/sweep.cjs --port 4324` writes `.command-logs/controls-sweep/<view>/sheet-NN.png`, `findings.json` and `summary.md`. Read `summary.md`, open the contact sheets, and give one sheet group each to a subagent that can load the `impeccable` skill (agent type `claude`; `bezeg-reviewer` cannot load skills) with the rubric in the spec's Part B step 4. Write ranked findings to `docs/reviews/control-choice/findings.md`.
3. Step 4: fix shared components from the findings. Already known (queue, "Findings already seen"): vertical rhythm inside an inspector group, slider help that restates the range, readout bullet size and indent, repeated status sentence in Inversion. Add the shared number grid for matrices (LinearMap, PhasePortrait cells) and catalogue pictures from the fixture.
4. Step 5: close-out against the spec's acceptance; before and after images under `docs/reviews/control-choice/`.

## Brief inputs for the next slices

Reuse the pilot brief shape: role and edit permission; setup; goal with the two documents to read (`docs/controls.md`, and "Migration rules for every slice" in the queue); owned paths; settled decisions; acceptance 1–6 (inventory check clean for the owned files, no local helper, typecheck/lint/focused unit, tests follow the control with the observed failure named, screenshots opened and checked against "Layout in the inspector", lesson prose reworded); commit in the worktree with the attribution lines; a 250-word return. Changes from the pilots:

- Setup line is `git reset --hard <your tip sha>` (the worker's branch is new and empty), not a fast-forward merge. A worker that is resumed after stopping runs in this worktree instead; then two workers share the checkout, so give them disjoint files and say "stage only your own hunks of `sl.ts` and `en.ts`".
- Add to settled decisions: `Slider` needs `fieldDecimals` when the old field took decimals on an integer step; pass the old big step as `bigStep` (the point row has the prop now); keep `integer` or `grid` exactly as the old field had it; put each control in its own `inspector-group` or keep the graph's existing grouping, never stack a slider directly on a caption.
- Ports 4325 and 4326 for the workers' dev servers.
- Slice file lists are in the queue table; `node scripts/controls-inventory.cjs --json` gives every call site with line numbers for a brief.

## Working notes that still hold

- Git Bash rewrites an argument that starts with `/` into a Windows path: pass routes without the leading slash.
- This session type is pinned to its worktree: compound shell commands that mix `git` with pipes or `cd` are refused. Run plain single commands; write helper scripts with the Write tool.
- `just typecheck` takes about 140 s. `just controls-fixture` takes 35 s but waits for a machine-wide test slot; with two workers and a publish gate running it waited 25 minutes. Publish gates are slow for the same reason.
- Screenshots: `node scripts/controls-sweep/shot.cjs <out.png> <route> [--port] [--width] [--height] [--eval] [--present] [--selector]`, output under `.command-logs/` (ignored by git). To pick a select option in `--eval`, set the value through the `HTMLSelectElement.prototype` value setter and dispatch a bubbling `change` event.
- The inspector is 310 px wide at 1440 × 900 (286 px of content); the fixture's inspectors have the same width.
- `PointListInput` rows are a subgrid of `.point-list-rows`; the field wrappers are `display: contents`, so a refusal hint spans the row. The large-text fallback is a container query on `.point-list-body`. `PointCollection`'s entry uses the same technique.
- No file in `docs/tasks/feature-streams/` for this work: the supervisor would start a second handler.

## Decisions and risks

- No open owner decision. Matrix cells stay typed fields until the number grid exists (spec, choice table).
- Risk: lesson clips and guided-example control steps that address a migrated field by selector. The pilots found none broken; each slice's acceptance 6 checks it.
- Risk: another stream is restyling the workspace (`fea90424`, `79760db4`); rebase before every dispatch and re-shoot a panel after a rebase that touches `DemonstrationWorkspace.css` or `WorkspaceControls.css`.

## Settings to keep

Model `claude-fable-5-2`, permission mode `auto`, agent `bezeg-handler`; workers `bezeg-worker` Sonnet `medium`; reviewers per the handler card.
