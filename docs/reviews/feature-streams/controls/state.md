# Controls stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [parallel plan](../../../tasks/feature-streams/controls.md#parallel-plan). Evaluation records: the "controls …" entries at the end of [evaluation-log.md](../../../agent-workflow/evaluation-log.md).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-controls`, `worktree-stream-controls`. Run state: **active**. Step 6 (phone playback) **accepted** and on `master`. Step 7 (lesson-authoring workstream 5, persisted scene validation): slices 1–4 implemented and on `master` (if the last publish below succeeded); **closeout pending**.
- **Do not rebase the stream branch.** It carries old commits that were published as rewritten copies; `git rebase origin/master` conflicts deep in Wave 3 history. Publish by cherry-picking new commits onto `origin/master` in the clean worktree and running `just publish` there (below). The stream branch is a work log; its tip has the same tree content as master for this stream's files.
- **Clean worktree for checks, previews and publishing:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached. Recipe: `git fetch -q origin && git checkout -q --detach origin/master && git cherry-pick <stream commits>`, `just build`, `just preview 4327` (background), smoke, stop the preview, `just publish --background --recipe runtime --base <origin/master sha> --commits <cherry-picked ids>`; result JSON in that worktree's `.command-logs/publish-*.json`; then `just ci <pushed sha>`. A run cancelled by a later push is covered by the next master run whose jobs include unit and browser shards (check `gh run view <id> --json jobs`; docs-only runs still ran the full pipeline on 2026-11-10).
- **Hosted CI this session:** `c9951438` (step 6) green, run 42762103792. `ff7413f6` (1a, open items) covered by `7caa352b` run 42781936298 green. `5d5dabab` (1b) covered by `60eb961f` run 42807394992 green (full unit and browser shards). `460359af` (slice 2 + limit message) green, run 42823765009. Slices 3–4 and this docs commit: see the last publish (`just publish --status` in the clean worktree, then `just ci <sha>`); record the result here.
- **Standing owner directions** (stream file, Decisions): handlers decide and record, with no confirmation; the README's other stop conditions still apply. Pipeline slices in disjoint files instead of waiting on publish and CI.

## Done in this session (2026-11-10)

- Step 6 verified (`check-changed`, smokes A and B: `w3-s6-smoke-a.md`, `w3-s6-smoke-b.md`), item 5 guidance (`docs/ui-functionality.md`, task completion evidence, spec status), accepted and published.
- Open items: point-set status and pending lines are notice regions (mirror their sentence, not `data-readout-live`); Voronoi's blocked construction says to choose a site first (`noRunReason` on `PlaybackButtons`). Evidence `ctl-open-items.md`, `oi-smoke.md`.
- Step 7 slices: 1a characterization (`s7-1a-inventory.md`, `PersistedEntryParity.test.ts`); 1b one complete check on every entry path (`s7-1b.md`, smoke `s7-1b-smoke.md`); 2 consumer refusal before mutation and batch preflight (`s7-2.md`, smoke `s7-2-smoke.md`); 3 deterministic defaults for omitted and partial fields (`s7-3.md`, smoke `s7-3-smoke.md`); 4 FivePoint/ThreeViews projection (`s7-4.md`). User impact for 1–4 in `docs/specs/lesson-authoring-architecture.md` section 5 ("Implemented, slice …").

## Next

1. **Step 7 closeout:** in the clean worktree at the step 7 head on master, `just check` once (integrated change); full workspace/lesson-runtime checklist smoke in both languages (`docs/smoke-tests.md`, BaseGraph/session paths changed), including save/reopen, file exchange, malformed refusal, figure export/return, Blossom and NURBS routes, FivePoint and ThreeViews save/reopen; one integrated engineering review of `460359af~..master` for step 7 files (Sonnet). Then mark the task file and queue row 7 accepted.
2. Then Wave 4: steps 8 and 9 in parallel (task files linked from `controls.md` rows 8, 9). Step 5a stays gated on Codex's lesson navigation (check `origin/master`).
3. The open items below as small slices between them.

## Open items

- **Step 7 review leftovers (non-blocking):** production casts in `checkPreset` (`as BaseGraphState`, `as BoardState[...]`), `as D` in `importPreset`/`consumerRefusal` path, `as S` in `importPreset`'s `replaceState`; point-set instance collections (overlays/options) vs the file path's canonical collections; `presetNoticeValue` not cleared on a later clean mount; `TriangulationGraph.tsx:374` throws inside `importPresetData` (collection check probably catches it first, unconfirmed); Hermite `consumerRefusal` redundant with its collection check; consumer limits in point-set/function/patch/projective `importPresetData` not audited; `ConsumerPreparation.test.tsx` `undefined as never`; no FivePoint degenerate-model `lastUnique` test; figure-batch `finish` no longer sets an initial view for a view-less Preset (removed: it broke Reset contracts).
- **Delaunay** still has two readout regions (its trace `LiveReadout` plus the inherited `TriangulationControls` one, `TriangulationControls.tsx:128`); decision 18 wants one.
- **Curve `importPreset` on a live scene appends curves** (slice 3 worker note, Bezier): check whether intended.
- Step 6 risks: focus kept across the breakpoint only when focus fell to the body (`PlaybackButtons.tsx`); Euler method has no Play and stays inline; collision playgrounds and lesson-only patch sweeps stay inline; Epicycle time slider candidate for a per-route live disclosure; `100svh` with real browser chrome unverified; 360 × 640 board at its 200 px floor with Reset below the fold at scroll 0 on 20 routes.
- `ReadoutHeading` relies on `.inspector-reveals-title` in `functions/FunctionReadout.css`; empty `FunctionReadout` rows render an empty `ul`; `ChapterPage.tsx:135` keeps `role="note"` (learn-ui stream).
- Decision 57 gaps: De Casteljau curve commands and Preset load leave a run going; lesson `play` of parametric roll and Epicycle ignores reduced motion. Collision playground autoplays in view; Play out of view does nothing.
- `.inspector-playback button:disabled` rule: check whether any native `disabled` remains in Voronoi/Delaunay (C6).
- `NumberInput` integer hint lacks "whole numbers"; `UnavailableButton` `title` plus hidden description can be read twice.
- Patches (low): Derivatives corner `aria-label`; `PatchPointEditor` new `points` array each render; Insertion refusal separator after a language switch; knot editor drag refusal reasons unchecked.
- Test debts: `VoronoiGraph.host.test.tsx` "schedules no timers" predates `TracePlayback`; duplicates in `frameFit.test.ts`/`exampleAndFrame.test.ts`; `sharedControls.graphs.test.tsx` per-graph restore; three compgeo host tests wait 600 ms real time.
- Carried: `ChoiceSelect` clipped at 200 % text (one `test.fail`); the count setter's refusal ignores `ReplacementRevision`; no screen-reader run, Chromium only. Curve workspace `onAdd` never refuses; no De Casteljau export check.

## Risks and working notes

- The machine is slow while a worker runs `check-changed`: shell calls time out at 120 s and move to the background; read results with the Read tool on the task output or the `.command-logs` file.
- Haiku smoke workers wrote broken harness scripts twice (reading JSXGraph internals); a working Playwright pattern is `.command-logs/s7-2-smoke/run.cjs` (storage key `bezeg-2.0:preset-<collection>` with `{data:[…]}`, Preset save under "Shrani", points are SVG ellipses; NURBS draws one extra ellipse, its marker at `t`).
- Workers that hit HANDOFF and leave background work: stop them (TaskStop) before a continuation worker edits the same files.
- Line endings: many files have CRLF working copies with clean status; leave them. Edits and `git add` normalise to LF.
- Smoke workers sometimes skip their evidence file; say "MUST write" in the prompt.
- CSS-source tests do not prove the cascade: check specificity against `.workspace-inspector .tools .btn` (0,3,0) and `.demonstration-workspace button` (0,1,1), and smoke-measure.
- `check-changed` "selector removed" warnings for `.visually-hidden` and fixture `data-testid` are false positives.
- Ports: 4317 Codex, 4327 previews, 4328 the controls fixture.

## Settings

Handler budget 1.5x (`BEZEG_HANDLER_BUDGET_SCALE` in this worktree's untracked `.claude/settings.local.json`): BUDGET SOFT about 262k, BUDGET HANDOFF about 322k for Opus. Launch with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`. Each handler launches its successor the same way at handoff and passes this rule on. Routing per the handler card; worker cap per the parallel plan.
