# Controls stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [parallel plan](../../../tasks/feature-streams/controls.md#parallel-plan). Evaluation records: the "controls …" entries at the end of [evaluation-log.md](../../../agent-workflow/evaluation-log.md).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-controls`, `worktree-stream-controls`. Run state: **active**. **Every queue row is accepted** (steps 1–9, 3a, 5, 5a). What remains is the open-item list below, as small slices.
- **Do not rebase the stream branch.** Bring it up to date with `git merge origin/master` (last merged 2026-11-11 at `7450f0b6`, clean). When master holds cherry-picked copies of stream commits, conflicts in those files resolve to the stream side (`git checkout --ours`), after `git log <merge-base>..origin/master -- <files>` confirms master has no other change to them. Publish by cherry-picking new stream commits onto `origin/master` in the clean worktree.
- **Clean worktree for checks, previews and publishing:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached. Recipe: `git fetch -q origin && git checkout -q --detach origin/master && git cherry-pick <stream commits>`, `just build`, `just preview 4327` (background; a rebuild under a running preview is served after a hard reload), smoke, `just publish --background --recipe runtime --base <origin/master sha> --commits <ids, oldest first, comma-separated>`; check `just publish --status` there; then `just ci <pushed sha>`. The publish gate's `check-changed` takes about 15 min while other tests run.
- **Hosted CI (2026-11-11):** earlier runs are in this file's git history. `25c6b66b` (batch 4) green 43024788742; `0a1e7959` green 43025170647; `d6f1e876` (Blossom same-shape import, export pause in map graphs, drift guard) green 43028635673; `eac6f4af` (Blossom Preset degree) green 43033238767; `7450f0b6` (levelsets Preset) green 43036320505. `538f6058` (ChoiceSelect, triangular test, constructor sweep) pushed 14:47, CI not yet read. The sixth handler's last batch: see Next 1.
- **Standing owner directions** (stream file, Decisions): handlers decide and record, with no confirmation; the README's other stop conditions still apply. Pipeline slices in disjoint files instead of waiting on publish and CI.

## Done in this session (2026-11-11, sixth handler)

Each slice has a note `oi-*.md` in this directory.

- Blossom same-shape import (`31258876`) verified: a same-degree, same-count import with other knots and points keeps the objects and redraws curve, blossom and label (test fails with the knot sync removed); smoked (`b5-blossom-smoke/evidence.md` in the clean worktree); published.
- **Found by that smoke, pre-existing on master:** a Blossom Preset of another degree, selected from the menu, drew no blossom (figure path merged the mount-time segment index into the new knots). Fixed in `figurePresetGraphState`, stored args validated as finite numbers (`oi-blossom-preset-degree.md`); browser recheck passed.
- Figure-state audit of 30 `figurePresetGraphState` overrides: none confirmed stale (`oi-figure-state-audit.md`). Its suspicion on the level-set graphs was confirmed: their Presets were refused on selection. Fixed (`oi-levelsets-preset.md`). Then `src/graphs/PresetRoundTrip.contract.test.tsx` (121 cases, ~57 s) saves, selects and resets a Preset on every graph: ComplexPower and EulerCircle (F2a, merged today) failed the same way and are fixed (`oi-preset-roundtrip.md`). None of these four graphs has a route yet, so no user holds a refused Preset.
- Export pauses playback: LogisticMap, LinearMap, ComplexPower and EulerCircle got `beforeFigureCapture`; TriangularPatch sweeps got a test case. Every `override pausePlayback` under `src/graphs` now has a capture hook (`oi-export-maps.md`; the complex pair in commit `ade30c59`).
- `graphClassFiles` drift guard requires each class's `<stem>.ts(x)`.
- `ChoiceSelect` at 200 % text: a clipped selected text is repeated in full under the select (`data-choice-full`, aria-hidden); the controls fixture's `test.fail` is a normal test and selects are back in its clipping check; the handler made measurement run only on value/option change and resize with one shared canvas (`oi-choiceselect-200.md`).
- Curve subclass constructors that throw after `super()` now sweep their objects (`finishConstruction`; weak snapshot) (`oi-subclass-construct-leak.md`).
- Closed by smoke: Step 6 `PlaybackButtons` focus across the breakpoint (`(max-width: 700px), (max-height: 500px)`, `useGraphAdjacentPlayback.ts:3`) on linear-map and convex-hull, both directions, while playing (`b5-playback-focus/evidence.md`); Step 9 projective in English on all five routes; Step 5a Bézier last-frame focus (SL, EN) and EN hide/reopen/exit (`b5-en-smoke/evidence.md`).
- Closed by decision: `TraceCurvePairGraph.tsx:213` clamp. On the Preset path (`BaseGraph.importPreset`) the incoming graph state is applied before `importPresetData`, so the clamp already uses the incoming tolerance; on lesson paths (`SceneReplacement.ts:92`, then `:101`) the whole state is replaced right after the data, superseding the clamp.

## Next

1. **Publishing at handoff:** `ade30c59` (complex export pause), `232c1624` (Preset round-trip contract and complex fix) and the handoff docs commit, cherry-picked onto `538f6058`. Read `just publish --status` in the clean worktree, then `just ci` for `538f6058` and for the new head; record them.
2. Open items below as small slices, two at a time in disjoint files.

## Open items

- **New graphs without routes (F2a):** LinearProgram, ContourMap, ComplexPower, EulerCircle. When a route or lesson mounts them, smoke Preset save, select and Reset there. New F2a graphs: run `PresetRoundTrip.contract.test.tsx` and `ExportPausesPlayback.test.tsx` after merging (the contract test enumerates graphs; a graph outside `allGraphFactories` must be added by hand, as ComplexPower, EulerCircle and Solids were).
- **Contract test cost:** `PresetRoundTrip.contract.test.tsx` takes ~57 s; if the unit stage slows, scope it like the catalog sweeps (`scripts/transient-state-scope.cjs`).
- **Step 8 leftover:** Blossom Preset reopen sub-pixel axis-tick path difference (not a defect; also seen after Reset without a drag).
- **Step 9 leftover:** English Preset-import refusal text not smoked (units cover the catalog).
- **Step 7 leftovers:** `importFigurePresetData` and lesson-restore casts kept (reasons in `oi-step7-casts.md`).
- **Step 5a:** the lesson card scrolls with the page (ADR 0003; by design).
- Step 6 risks: Euler has no Play; collision playgrounds and lesson-only patch sweeps inline; Epicycle time slider candidate for a live disclosure; `100svh` with real browser chrome unverified; 360 × 640 board at its 200 px floor with Reset below the fold on 20 routes.
- Decision 57: legacy selected-curve panel (`BaseCurveGraph` `getSelectedCurveCommands`, `onChanged` = `store.notify`) cannot tell an applied operation from a preview, so it does not pause a De Casteljau run; Add/Delete-points board clicks that edit nothing pause it (minor). Collision playground autoplays in view; Play out of view does nothing.
- Carried: no screen-reader run, Chromium only. `ChoiceSelect` full-text line: the `ResizeObserver` path has no JSDOM test; covered in the browser by the controls fixture.

## Risks and working notes

- The machine is slow while a worker runs `check-changed` or a smoke: shell calls time out and move to the background; read results from the task output or `.command-logs`. Two `check-changed` runs contend for one lock; workers should wait and retry once.
- Working Playwright patterns: `.command-logs/b5-blossom-smoke/`, `b5-playback-focus/run.cjs`, `b5-en-smoke/`, `s7-closeout-smoke/run.cjs` in the clean worktree (storage key `bezeg-2.0:preset-<collection>` with `{data:[{id, data}]}`, Preset UI under "Shrani"; linear-map playback appears only in iterate mode).
- The deployed site (https://efodx.github.io/bezeg-2.0/) is master: compare against it to tell a regression from a pre-existing defect without a second build.
- Read smoke "failures" before acting: they are often harness, by-design or pre-existing.
- Workers that hit HANDOFF and leave background work: wait for or stop them before a continuation edits the same files. Smoke workers: say "MUST write" the evidence file.
- Line endings: many files have CRLF working copies; regex edits with `\s*` capture `\r` — edit by hand.
- CSS-source tests do not prove the cascade: check specificity and smoke-measure.
- `check-changed` "selector removed" warnings for `.visually-hidden`, `data-readout` and fixture `data-testid` are false positives.
- Other streams' JSDOM redraw-timing tests write `.command-logs/*.log`; hosted CI has no such directory, so each needs `mkdirSync('.command-logs', {recursive: true})`.
- Ports: 4317 Codex, 4327 previews, 4328 the controls fixture.

## Settings

Handler budget 1.5x (`BEZEG_HANDLER_BUDGET_SCALE` in this worktree's untracked `.claude/settings.local.json`): BUDGET SOFT about 262k, BUDGET HANDOFF about 322k for Opus. Launch with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`. Each handler launches its successor the same way at handoff and passes this rule on. Routing per the handler card; worker cap per the parallel plan.
