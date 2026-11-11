# Controls visual stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [stream file](../../../tasks/feature-streams/controls-visual.md) and the [spec](../../../specs/control-visual-polish.md).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-visual`, `worktree-stream-visual`, created 2026-11-11 from `origin/master`, own `npm ci`. Run state: **active**. Port 4322.
- **Clean worktree for checks, previews and publishing:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached; shared with the closed controls stream. It holds a production build of `dc746cff` in `dist/`. Recipe: `git fetch -q origin && git checkout -q --detach origin/master && git cherry-pick <stream commits>`, `just build`, `just preview 4322` (background), smoke, `just publish --background --recipe runtime --base <origin/master sha> --commits <ids, oldest first>`; `just publish --status`; then `just ci <pushed sha>`.
- **Branch updates:** bring the stream branch up to date with `git merge origin/master`, not rebase, so published cherry-picks never conflict with a rewritten branch (the controls stream's practice). Conflicts in files that master holds only as cherry-picked copies resolve to the stream side after `git log <merge-base>..origin/master -- <files>` confirms no other change.
- **Owner directions:** handlers decide and record, with no confirmation. Launch successors with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium` at budget handoff, passing this rule on; end without a successor when no actionable work is left.

## Started (2026-11-11, by the controls stream's eighth handler)

- The owner closed the controls stream and asked for (a) a visual pass over the shared controls, many of which "are still quite bad looking", and (b) removal of per-Demonstration tests that shared controls now make redundant.
- Spec, stream file and README row written; nothing implemented yet.
- **Test inventory** ([test-redundancy-inventory.md](test-redundancy-inventory.md), Sonnet worker, read-only on `dc746cff`): little can be deleted outright. `sharedControls.graphs.test.tsx` runs the full control contract on only two graphs per control kind, and `PresetRoundTrip.contract.test.tsx` uses mount-default data, so per-graph wiring and non-default Preset tests are KEEP. DELETE: 2 (`CurvatureBezierCurveGraph.test.ts:261` default-Preset round trip; `parametricCatalogue.test.ts:114` probably, unread). CONSOLIDATE: about 43 tests in 7 groups: board arrow keys move the selected point (about 10, compgeo and projective), 44 px handle hit zone (8), typed out-of-range refused (7), Reset unavailable at origin (6), focused control becomes `aria-disabled` and keeps focus (3 + 3 near), and CrossRatio/Pascal/PolePolar live-region and select-focus repeats (2 × 3). Time saving is a guess of 10–30 s of about 1800 s; the gain is mainly maintenance. Not assessed: appearance contracts, 195 unmount/dispose and 84 language-switch tests in `src/graphs`, non-graph `src/learning` tests; the arrow-key and live-region verdicts rest on names, not full reads.

## Next

1. **Step 1, audit:** dispatch `bezeg-smoke` (Sonnet `medium`) against `just preview 4322` in the clean worktree (rebuild first if master moved). Every Demonstration route (catalog list in `src/demonstrations.ts`), at 1440 × 900, 360 × 640 with touch, and Presentation mode, Slovenian. Screenshot the controls area; write a ranked findings table (route, control, problem kind, measurement, screenshot path) to `audit.md` here, screenshots under the clean worktree's `.command-logs/cv-audit/`. Skill: `.agents/skills/smoke-tester/SKILL.md`; checklist `docs/smoke-tests.md`. Include the known items: inspector `NumberInput` 40 px on touch (`src/graphs/base/WorkspaceControls.css:54` vs `src/inputs/NumberInput.css:26`), projective checkboxes 13 px (`/projective/five-point`, `/projective/three-views`).
2. **In parallel, step 5 first slice:** the two DELETE rows and the largest CONSOLIDATE group (arrow keys) as one `bezeg-worker` slice: read the full test bodies first, keep every graph-specific wiring assertion, observe each new helper failing on a broken graph, report `just test-cost` before and after.
3. Then step 2 (finalise the spec's criteria from the audit, tokens, `/bezier/curve` prototype with before/after screenshots and a UI/accessibility review).

## Risks and working notes

- The controls stream's [state note](../controls/state.md#risks-and-working-notes) has the working Playwright patterns, port notes and smoke-reading advice; read that section by range when briefing smoke.
- CSS-source tests do not prove the cascade: check specificity and measure in a browser (the 40 px inspector field is the standing example).
- Line endings: many files have CRLF working copies; edit by hand rather than with `\s*` regexes.
