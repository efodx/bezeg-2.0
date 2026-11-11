# Controls stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [parallel plan](../../../tasks/feature-streams/controls.md#parallel-plan). Evaluation records: the "controls …" entries at the end of [evaluation-log.md](../../../agent-workflow/evaluation-log.md).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-controls`, `worktree-stream-controls`. Run state: **active**. **Every queue row is accepted** (steps 1–9, 3a, 5, 5a). The open-item list below no longer holds an actionable slice: each item is by design, carried, or needs a browser with real chrome or a screen reader. What keeps the stream active is the guard duty in Next.
- **Do not rebase the stream branch.** Bring it up to date with `git merge origin/master` (last merged 2026-11-11 at `31135acc`, merge `29902142`). When master holds cherry-picked copies of stream commits, conflicts in those files resolve to the stream side (`git checkout --ours`), after `git log <merge-base>..origin/master -- <files>` confirms master has no other change to them. Publish by cherry-picking new stream commits onto `origin/master` in the clean worktree.
- **Clean worktree for checks, previews and publishing:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached. Recipe: `git fetch -q origin && git checkout -q --detach origin/master && git cherry-pick <stream commits>`, `just build`, `just preview 4327` (background; a rebuild under a running preview is served after a hard reload), smoke, `just publish --background --recipe runtime --base <origin/master sha> --commits <ids, oldest first, comma-separated>`; check `just publish --status` there; then `just ci <pushed sha>`. The publish gate's `check-changed` takes about 15 min while other tests run.
- **Hosted CI (2026-11-11):** earlier runs are in this file's git history. `538f6058` green 43041914455; `756c939c` (the sixth handler's last batch) green 43045816128; `5b1d355c` (ChoiceSelect resize test, Preset contract scope) green 43050048647; `c477ad6b` (legacy-panel apply pause `74855a10`, handoff docs) green 43052742466; `398d3e62` (the seventh handler's final docs, stream `983e20b1`) green 43055248084. After merge `29902142` the stream branch holds all of master.
- **Standing owner directions** (stream file, Decisions): handlers decide and record, with no confirmation; the README's other stop conditions still apply. Pipeline slices in disjoint files instead of waiting on publish and CI.

## Done in this session (2026-11-11, seventh handler)

- Merged master twice (`fa322dbe`, `13976137`; only cherry-picked copies, resolved to the stream side); after each, `PresetRoundTrip.contract.test.tsx` (all 121) and `ExportPausesPlayback.test.tsx` passed.
- `ChoiceSelect` `ResizeObserver` path has JSDOM tests: shrink/grow shows/hides the full-text line, a plain re-render does not measure, the observer disconnects on unmount (`oi-choiceselect-resize-test.md`).
- `PresetRoundTrip.contract.test.tsx` is a scoped catalog sweep (`BEZEG_PRESET_ROUNDTRIP`): locally 25 cases (~23 s), all 121 in CI or with `=all` / `BEZEG_SWEEPS=all`; graph class changes add their graph, Preset shared paths run all (`oi-preset-roundtrip-scope.md`).
- Decision 57: an operation applied from the legacy selected-curve panel now calls `refreshWorkspace` (`onApplied`), so it would pause a De Casteljau run. Not reachable on the route today: De Casteljau sets `bezierDisabled`, so its panel lists no operations; the test enables them (`oi-decasteljau-run.md`, Follow-up). Add/Delete clicks that edit nothing pause a run by design (the board `down` listener pauses on every press).
- Closed by smoke against the deployed master: English Preset-import refusal text on `/bezier/curve` and `/compgeo/convex-hull` (non-JSON, corrupt field) is English, `role=alert`, graph and storage unchanged; Slovenian control passes (`.command-logs/b6-en-import-refusal/evidence.md` in the clean worktree). A valid file of another collection imports on any route: the file import is collection-wide by design. The 404 on every deployed page is the Pages SPA fallback for deep routes.
- Closed by reading: 360 × 640 Reset just below the fold at scroll 0 on 20 routes is inside Step 6's accepted criterion (one scroll shows the board and the whole row on all 25).

## Check in this session (2026-11-11, eighth handler)

- The seventh handler's publish `publish-398d3e62-f96118` finished ok (pushed 16:08 UTC); hosted CI for `398d3e62` green (run 43055248084).
- First `git fetch`: master held only cherry-picked stream copies. While this check's docs commit published (`f6084b2f`), master gained F2b trigonometry (`a70819b7`: `unit-circle`, `triangle-solver`, trig Preset collection, `PresetImport` change) and `31135acc` (F2a legend/marker repairs). Merged as `29902142` without conflicts; `BEZEG_PRESET_ROUNDTRIP=all` round-trip contract 123/123 (the two trig graphs reach it through `registeredGraphLoaders`, no `unrouted` entry needed) and `ExportPausesPlayback` passed. Neither trig graph is in the guard-duty smoke list. No open item became actionable, so the stream ends here without a successor; the owner relaunches it.

## Next

1. **Nothing is publishing.** `git fetch` and check `git log HEAD..origin/master` for commits that are not cherry-picked stream copies.
2. **Ending without work (seventh handler's decision):** if master holds no new graph or change to controls code and no open item has become actionable, record the check here, push, and end without launching a successor; the owner relaunches the stream. Launch a successor only at a budget handoff with work left.
3. **Guard duty:** when master gains graphs from other streams (F2a), merge and rerun `BEZEG_PRESET_ROUNDTRIP=all just unit src/graphs/PresetRoundTrip.contract.test.tsx src/graphs/ExportPausesPlayback.test.tsx`; a graph outside `allGraphFactories` must be added to the contract's `unrouted` list by hand. When a route or lesson mounts LinearProgram, ContourMap, ComplexPower or EulerCircle, smoke Preset save, select and Reset there.

## Open items (none actionable now)

- **Step 8 leftover:** Blossom Preset reopen sub-pixel axis-tick path difference (not a defect; also seen after Reset without a drag).
- **Step 7 leftovers:** `importFigurePresetData` and lesson-restore casts kept (reasons in `oi-step7-casts.md`).
- **Step 5a:** the lesson card scrolls with the page (ADR 0003; by design).
- Step 6 risks: Euler has no Play; collision playgrounds and lesson-only patch sweeps inline; Epicycle time slider candidate for a live disclosure; `100svh` with real browser chrome unverified; 360 × 640 board at its 200 px floor.
- Decision 57: collision playground autoplays in view; Play out of view does nothing.
- Carried: no screen-reader run, Chromium only. English refusal smoke covered two routes and focus by DOM only.

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
