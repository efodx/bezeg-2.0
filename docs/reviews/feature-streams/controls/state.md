# Controls stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [parallel plan](../../../tasks/feature-streams/controls.md#parallel-plan). Evaluation records: the "controls …" entries at the end of [evaluation-log.md](../../../agent-workflow/evaluation-log.md).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-controls`, `worktree-stream-controls`. Run state: **active**. **Every queue row is accepted** (steps 1–9, 3a, 5, 5a; 7, 8, 9 and 5a on 2026-11-10). What remains is the open-item list below, as small slices.
- **Do not rebase the stream branch.** Bring it up to date with `git merge origin/master` (clean on 2026-11-10; its tree then equals master). Publish by cherry-picking new stream commits onto `origin/master` in the clean worktree and running `just publish` there.
- **Clean worktree for checks, previews and publishing:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached. Recipe: `git fetch -q origin && git checkout -q --detach origin/master && git cherry-pick <stream commits>`, `just build`, `just preview 4327` (background), smoke, stop the preview, `just publish --background --recipe runtime --base <origin/master sha> --commits <cherry-picked ids, oldest first>`; result JSON in that worktree's `.command-logs/publish-<head>-*.json`; then `just ci <pushed sha>`.
- **Hosted CI this session:** `5a54c823` green (run 42849822095); `a2b7d711` (Reset fix, step 8 slice 1) green (42868318164); `a996559c` (steps 7 docs, 8, 9) green (42899376664, developer tools 42899376384); `328c2a2e` (Delaunay readout) green (42902921531). **Last publish:** step 5a, the curve replacement test and the 5a smoke doc (clean-worktree commits `8700cbeb,24aa9341,8851a40c` on base `328c2a2e`) and this handoff's docs commit: check `just publish --status` / the publish JSON and run `just ci <sha>`; record it here.
- **Standing owner directions** (stream file, Decisions): handlers decide and record, with no confirmation; the README's other stop conditions still apply. Pipeline slices in disjoint files instead of waiting on publish and CI.

## Done in this session (2026-11-10, second handler)

- Step 7 closeout: `just check` at `5a54c823`; integrated review (`s7-closeout-review.md`) found host Reset following the fixed persisted default, fixed test-first (`35888a85` on master); full checklist smoke both languages (`s7-closeout-smoke.md`). Accepted.
- Step 8 (owned standalone scenes): characterization (`s8-1.md`), `OwnedScene.ts` slot and Blossom/NURBS migration (`s8-2.md`, review `s8-2-review.md`), smoke (`s89-smoke.md`). Accepted.
- Step 9 (feature-local registration, projective pilot): design (`s9-design.md`), slices 1–3 (`s9-1.md`, `s9-1-review.md`, `s9-2.md`, `s9-3.md`), ADR 0059, production route smoke (`s89-smoke.md`). Accepted.
- Step 5a: recheck (`s5a-recheck.md`), Next/Back focus and off-board card drag (`s5a.md`, `s5a-smoke.md`). Exit focus left unchanged by decision. Accepted.
- Open items closed: Delaunay single readout (`oi-delaunay-readout.md`, `oi-delaunay-smoke.md`); curve Preset append (no defect; `oi-curve-import.md`, regression test `PersistedCurveReplacement.test.tsx`); ThreeViews sliders after Save (product behaviour: hidden while the Save tab is open).

## Next

1. Record the last publish's CI above.
2. Open items below as small slices, two or three at a time in disjoint files; smoke when a control or route changes.

## Open items

- **Refusals as status, not alert:** Delaunay/triangulation refusals render in the `refusal-slot` polite status region, no `role=alert` (`oi-delaunay-smoke.md`). Decide against decision 18 and the readout guidance in `docs/ui-functionality.md`.
- **Step 8 leftovers:** `BaseGraph.sceneSlot` not cleared in `unmount` (inert); `constructOrSweep` only on Blossom/NURBS, the curve-layer constructor `AbstractJXGPointControlledCurve` still leaks points if it throws; Blossom always rebuilds on import (a remount builds and discards one scene); the empty `initialize()` overrides remain; Blossom Preset reopen shows a sub-pixel axis-tick path difference (points identical; not judged a defect).
- **Step 9 leftovers:** rival collection built inside a graph for the same storage key is unchecked (`registrationIntegrity.test.ts:65-77`); `scripts/ci-change-scope.cjs:17` lists `projective-cross-ratio`; `transient-state-scope.cjs`, `smoke-catalog.cjs` and the clip probe still parse source text; legacy families stay on central composition by design; projective smoke ran in Slovenian only.
- **Step 7 review leftovers (non-blocking):** production casts in `checkPreset` (`as BaseGraphState`, `as BoardState[...]`), `as D`/`as S` in `importPreset`; point-set instance collections vs the file path's canonical collections; `presetNoticeValue` not cleared on a later clean mount; `TriangulationGraph.tsx:374` throws inside `importPresetData`; Hermite `consumerRefusal` redundant; consumer limits in point-set/function/patch/projective `importPresetData` not audited; `ConsumerPreparation.test.tsx` `undefined as never`; no FivePoint degenerate-model `lastUnique` test; figure-batch `finish` sets no initial view for a view-less Preset.
- **Step 5a:** the lesson card scrolls with the page (graph-anchored by ADR 0003); Bézier last-frame focus and EN hide/reopen not smoked.
- Step 6 risks: focus kept across the breakpoint only when focus fell to the body (`PlaybackButtons.tsx`); Euler method has no Play and stays inline; collision playgrounds and lesson-only patch sweeps stay inline; Epicycle time slider candidate for a per-route live disclosure; `100svh` with real browser chrome unverified; 360 × 640 board at its 200 px floor with Reset below the fold at scroll 0 on 20 routes.
- `ReadoutHeading` relies on `.inspector-reveals-title` in `functions/FunctionReadout.css`; empty `FunctionReadout` rows render an empty `ul`; `ChapterPage.tsx:135` keeps `role="note"`.
- Decision 57 gaps: De Casteljau curve commands and Preset load leave a run going; lesson `play` of parametric roll and Epicycle ignores reduced motion. Collision playground autoplays in view; Play out of view does nothing.
- `.inspector-playback button:disabled` rule: check whether any native `disabled` remains in Voronoi/Delaunay (C6).
- `NumberInput` integer hint lacks "whole numbers"; `UnavailableButton` `title` plus hidden description can be read twice.
- Patches (low): Derivatives corner `aria-label`; `PatchPointEditor` new `points` array each render; Insertion refusal separator after a language switch; knot editor drag refusal reasons unchecked.
- Test debts: `VoronoiGraph.host.test.tsx` "schedules no timers" predates `TracePlayback`; duplicates in `frameFit.test.ts`/`exampleAndFrame.test.ts`; `sharedControls.graphs.test.tsx` per-graph restore; three compgeo host tests wait 600 ms real time.
- Carried: `ChoiceSelect` clipped at 200 % text (one `test.fail`); the count setter's refusal ignores `ReplacementRevision`; no screen-reader run, Chromium only. Curve workspace `onAdd` never refuses; no De Casteljau export check.

## Risks and working notes

- The machine is slow while a worker runs `check-changed` or a smoke: shell calls time out at 120 s and move to the background; read results from the task output or `.command-logs`.
- Working Playwright patterns: `.command-logs/s7-closeout-smoke/run.cjs`, `s89-smoke/`, `s5a-smoke/` in the clean worktree (storage key `bezeg-2.0:preset-<collection>` with `{data:[…]}`, Preset save under "Shrani"; ThreeViews sliders hide while the Save tab is open).
- Read smoke "failures" before acting: three this session were harness or by-design.
- Workers that hit HANDOFF and leave background work: wait for or stop them before a continuation edits the same files. Smoke workers: say "MUST write" the evidence file.
- Line endings: many files have CRLF working copies with clean status; leave them.
- CSS-source tests do not prove the cascade: check specificity against `.workspace-inspector .tools .btn` (0,3,0) and `.demonstration-workspace button` (0,1,1), and smoke-measure.
- `check-changed` "selector removed" warnings for `.visually-hidden` and fixture `data-testid` are false positives.
- Ports: 4317 Codex, 4327 previews, 4328 the controls fixture.

## Settings

Handler budget 1.5x (`BEZEG_HANDLER_BUDGET_SCALE` in this worktree's untracked `.claude/settings.local.json`): BUDGET SOFT about 262k, BUDGET HANDOFF about 322k for Opus. Launch with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`. Each handler launches its successor the same way at handoff and passes this rule on. Routing per the handler card; worker cap per the parallel plan.
