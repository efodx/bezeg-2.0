# Controls stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [parallel plan](../../../tasks/feature-streams/controls.md#parallel-plan). Evaluation records: the "controls …" entries at the end of [evaluation-log.md](../../../agent-workflow/evaluation-log.md).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-controls`, `worktree-stream-controls`. Run state: **active**. **Every queue row is accepted** (steps 1–9, 3a, 5, 5a). What remains is the open-item list below, as small slices.
- **Do not rebase the stream branch.** Bring it up to date with `git merge origin/master`. When master holds cherry-picked copies of stream commits, conflicts in those files resolve to the stream side (`git checkout --ours`), after `git log <merge-base>..origin/master -- <files>` confirms master has no other change to them (done on 2026-11-11). Publish by cherry-picking new stream commits onto `origin/master` in the clean worktree.
- **Clean worktree for checks, previews and publishing:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached. Recipe: `git fetch -q origin && git checkout -q --detach origin/master && git cherry-pick <stream commits>`, `just build`, `just preview 4327` (background), smoke, stop the preview, `just publish --background --recipe runtime --base <origin/master sha> --commits <cherry-picked ids, oldest first>`; check `just publish --status` there; then `just ci <pushed sha>`.
- **Hosted CI (2026-11-11):** earlier runs are in this file's git history. `ff64c783` green 42999097628. `ae3786a6` (fourth handler, batch 4) **failed** run 43001329690, not ours: F2a's Descent test wrote `.command-logs/mech02b-redraw.log` without the directory; the next commit `f032639c` was docs-only and showed green with its unit stage skipped. Fixed by `baeeb369` (published with `6ed5d18c`, run cancelled by a newer push); `9d360010` (contains both) green 43006718915. `d362133f` (batch 2) green 43010600517, developer tools 43010600607. `1f1b310e` (batch 3) and batch 4: see Next.
- **Standing owner directions** (stream file, Decisions): handlers decide and record, with no confirmation; the README's other stop conditions still apply. Pipeline slices in disjoint files instead of waiting on publish and CI.

## Done in this session (2026-11-11, fifth handler)

Each slice has a worker note `oi-*.md` in this directory. All passed focused `just unit` and typecheck; `check-changed` per note.

- Hermite `consumerRefusal` removed as redundant (the collection check ends in `hermiteRejection`); FivePoint `lastUnique` through a degenerate (four collinear points) model tested (`oi-hermite-fivepoint.md`).
- `StoredGraphState = Partial<BaseGraphState>` for `Preset.graphState`, `CheckedPreset.graphState` and every `figurePresetGraphState`; the `checkPreset` cast is gone (`oi-stored-graph-state.md`).
- `CheckedPreset<D>`/`checkPreset<D>`: the Preset import path drops its `as D`/`as S` casts; kept with reasons in `importFigurePresetData` and the lesson restore; `ConsumerPreparation.test.tsx` `undefined as never` replaced (`oi-step7-casts.md`).
- Step 9 parsers: `graphClassFiles` and the clip probe fail loudly on drift; `smoke-catalog.cjs` already parses the AST and throws (closed); `just tooling-test` runs both tests (`oi-step9-parsers.md`). Alias defect fixed: a class file imported under an alias (`SubdivisionGraph1.tsx` as `DecasteljauGraph3`) no longer selects its whole directory; it is still selected through `changedFiles` (`oi-class-alias.md`).
- Consumer limits audit: every point-set, function, patch and projective `importPresetData` is refused by its collection first; no gaps (`oi-consumer-limits-audit.md`).
- Curve-layer constructor `AbstractJXGPointControlledCurve` sweeps its objects when it throws (`sweepObjectsSince` in `OwnedScene.ts`; `oi-curve-construct-leak.md`).
- Figure batch: a view-less Preset figure starts from the initial view, as Preset selection and Reset do; a `fitPresetView` hook replaces five curve `importPreset` overrides. Handler amendment: no fit in the shared figure path, because it also serves Reset and Preset selection (`oi-figure-initial-view.md`).
- Patch Preset collections accept only their own graph's state fields; foreign fields are refused with `unknown_patch_field`. User impact: only hand-edited files are refused (`oi-patch-state-fields.md`).
- `CountSetter` drops its blocked-press reason on a `ReplacementRevision` change (`oi-count-revision.md`).
- Export pauses playback: six graphs overrode `pausePlayback` but not `beforeFigureCapture` (De Casteljau 1 and 2, parametric roll, cobweb, simulation, patch sweeps); fixed, with `src/graphs/ExportPausesPlayback.test.tsx` and `DecasteljauExport.test.tsx` (`oi-decasteljau-export.md`).
- Closed by decision: `sharedControls.graphs.test.tsx` per-graph restore. It was a test-speed idea; the saving was already taken by running fewer graphs, and a restore contract would couple every graph to the test.
- Closed by decision: curve workspace `onAdd` never refuses, because there is no limit an add can hit (Bézier-family boards only, no maximum or degree cap; `oi-curve-onadd.md`).
- Fixed on master: F2a Descent redraw-timing test `mkdirSync` (`baeeb369`).
- Smoke (clean worktree `.command-logs/`): `b3-smoke/evidence.md`: figure batch view and Hermite drag pass; its Reset and patch-import items were harness failures (wrong Reset locator, missing fixture), covered by units. `b4-smoke/evidence.md`: PNG export during a run pauses it on both De Casteljau routes, Play resumes from the paused t, no console errors (SVG export not covered).
- Published: `baeeb369`+`6ed5d18c`; batch 2 as `d362133f`; batch 3 (leak, alias, figure view, patch fields, CountSetter) as `1f1b310e`.

## Next

1. Batch 4 (`3fb69382` export pauses playback, plus this handoff's docs): read `just publish --status` in the clean worktree, then `just ci` for the pushed sha and for `1f1b310e`; record both. If master is red from another stream's test, read the failure: a later docs-only run skips units, so look at the last run that ran them.
2. Open items below as small slices, two at a time in disjoint files. Good next pairs: the Step 6 `PlaybackButtons` breakpoint focus risk (needs a smoke) ∥ the `LogisticMapGraph` capture pause (once F2a is idle there).

## Open items

- **Export pause in another stream's graph:** `src/graphs/dynamics/LogisticMapGraph.tsx:427` overrides `pausePlayback` but not `beforeFigureCapture` (F2a, in flight). Pattern: `protected override beforeFigureCapture(): void { this.pausePlayback(); }` when its `pausePlayback` does not call super. TriangularPatchGraph sweeps share the fixed `BaseSurfaceGraph` override but have no test of their own.
- **Step 8 leftovers:** Blossom always rebuilds on import; Blossom Preset reopen sub-pixel axis-tick path difference (not a defect). Subclass constructors that create objects after `super()` are not covered by the curve-constructor sweep.
- **Step 9 leftovers:** projective smoke ran in Slovenian only (needs an English smoke run); the `graphClassFiles` drift guard checks the directory, not a strict `<stem>.tsx`.
- **Step 7 leftovers:** `importFigurePresetData` and lesson-restore casts kept (reasons in `oi-step7-casts.md`); `TraceCurvePairGraph.tsx:213` clamps the step with the current, not the incoming, clip tolerance (affects only the clamp).
- **Step 5a:** lesson card scrolls with the page (ADR 0003); Bézier last-frame focus and EN hide/reopen not smoked.
- Step 6 risks: focus kept across the breakpoint only when focus fell to the body (`PlaybackButtons.tsx`); Euler has no Play; collision playgrounds and lesson-only patch sweeps inline; Epicycle time slider candidate for a live disclosure; `100svh` with real browser chrome unverified; 360 × 640 board at its 200 px floor with Reset below the fold on 20 routes.
- Decision 57: legacy selected-curve panel (`BaseCurveGraph` `getSelectedCurveCommands`, `onChanged` = `store.notify`) cannot tell an applied operation from a preview, so it does not pause a De Casteljau run; Add/Delete-points board clicks that edit nothing pause it (minor). Collision playground autoplays in view; Play out of view does nothing.
- Carried: `ChoiceSelect` clipped at 200 % text (one `test.fail`); no screen-reader run, Chromium only.

## Risks and working notes

- The machine is slow while a worker runs `check-changed` or a smoke: shell calls time out at 120 s and move to the background; read results from the task output or `.command-logs`.
- Working Playwright patterns: `.command-logs/s7-closeout-smoke/run.cjs`, `s89-smoke/`, `s5a-smoke/` in the clean worktree (storage key `bezeg-2.0:preset-<collection>` with `{data:[…]}`, Preset save under "Shrani"; ThreeViews sliders hide while the Save tab is open).
- Read smoke "failures" before acting: they are often harness, by-design or pre-existing (a heading margin from `.inspector-group h3` specificity).
- A shell call that lists, diffs or commits can take minutes while a worker runs tests; prefer the Read/Grep tools, and run git in the background.
- Workers that hit HANDOFF and leave background work: wait for or stop them before a continuation edits the same files. Smoke workers: say "MUST write" the evidence file.
- Line endings: many files have CRLF working copies with clean status; leave them.
- CSS-source tests do not prove the cascade: check specificity against `.workspace-inspector .tools .btn` (0,3,0) and `.demonstration-workspace button` (0,1,1), and smoke-measure.
- `check-changed` "selector removed" warnings for `.visually-hidden` and fixture `data-testid` are false positives.
- Other streams' JSDOM redraw-timing tests (F2a) write `.command-logs/*.log`; hosted CI has no such directory, so each needs `mkdirSync('.command-logs', {recursive: true})`. `just unit` creates the directory itself, so a local run cannot reproduce the failure; run the test with no directory present to check.
- Ports: 4317 Codex, 4327 previews, 4328 the controls fixture.

## Settings

Handler budget 1.5x (`BEZEG_HANDLER_BUDGET_SCALE` in this worktree's untracked `.claude/settings.local.json`): BUDGET SOFT about 262k, BUDGET HANDOFF about 322k for Opus. Launch with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`. Each handler launches its successor the same way at handoff and passes this rule on. Routing per the handler card; worker cap per the parallel plan.
