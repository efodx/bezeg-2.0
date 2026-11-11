# Controls stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [parallel plan](../../../tasks/feature-streams/controls.md#parallel-plan). Evaluation records: the "controls …" entries at the end of [evaluation-log.md](../../../agent-workflow/evaluation-log.md).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-controls`, `worktree-stream-controls`. Run state: **active**. **Every queue row is accepted** (steps 1–9, 3a, 5, 5a). What remains is the open-item list below, as small slices.
- **Do not rebase the stream branch.** Bring it up to date with `git merge origin/master` (clean on 2026-11-11). Publish by cherry-picking new stream commits onto `origin/master` in the clean worktree and running `just publish` there.
- **Clean worktree for checks, previews and publishing:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached. Recipe: `git fetch -q origin && git checkout -q --detach origin/master && git cherry-pick <stream commits>`, `just build`, `just preview 4327` (background), smoke, stop the preview, `just publish --background --recipe runtime --base <origin/master sha> --commits <cherry-picked ids, oldest first>`; result JSON in that worktree's `.command-logs/publish-<head>-*.json`; then `just ci <pushed sha>`.
- **Hosted CI:** `8851a40c` (step 5a) **failed** run 42915643947 (stale guided-lesson smoke); fixed by `42134a5d` green 42923027436. `b73cb14d` green 42928690998; `2e877ae9` green 42930172745; `4f72c86c` (readout, De Casteljau) green 42977976809; `f4f2f1b9` (preset notice, smoke doc, handoff docs) green 42979339585. **Publishing:** see "Done in this session (fourth handler)" for what was published last and its CI.
- **Standing owner directions** (stream file, Decisions): handlers decide and record, with no confirmation; the README's other stop conditions still apply. Pipeline slices in disjoint files instead of waiting on publish and CI.

## Done in this session (2026-11-11, fourth handler)

- CI recorded for `4f72c86c` and `f4f2f1b9` (both green, above).
- Refusals as status, not alert: **decided** (spec decision 69): `RefusalNotice` stays a polite `role="status"` everywhere.
- `BaseFunctionGraph` reveal heading is `ReadoutHeading` (`395492f6`). `ChapterPage.tsx:135` `role="note"`: closed by decision; it is a chapter-page caveat by the return link, not readout help, and `note` is the correct ARIA role for parenthetic text, so the C27 "no `role=note` on readout help" rule does not apply.
- Test debt: `exampleAndFrame.test.ts` duplicates removed, renamed `ExampleSelect.test.ts` (`0c3db492`).
- Step 7: `isBoundingBox` is a type guard; the two `boundingBox` casts in `checkPreset` are gone (`79b2ce73`). The `as BaseGraphState` cast stays for now: `Preset.graphState` and ~30 `figurePresetGraphState` overrides are typed `BaseGraphState`, while stored state may omit `initialized`; an honest stored-state type is its own slice (below).
- Patches (low), `oi-patches-low.md`: B-spline Insertion refusal now follows a language switch (`RefusalChannel` accepts a `() => Message` refusal resolved at render; `19e0d701`); `PatchPointEditor` keeps a stable point list and knot-drag refusal reasons are tested (`84533dfc`); Derivatives corner select closed as correct (visible `ChoiceSelect` label).
- No smoke: the heading and editor changes preserve behaviour, and the Insertion language fix is covered by its unit test. `check-changed` passed on all of it (`.command-logs/2026-11-11T07-40-18-505Z-21420-2b187226.log`).

## Done earlier (2026-11-11, third handler)

- CI failure on step 5a fixed: `oi-ci-focus-smoke.md`.
- Integer `NumberInput` refusal says "celo število" / "whole number" (`oi-small-items.md`); shared control specs gain `integer`.
- `UnavailableButton` title + description: closed by decision (HTML-AAM uses `title` only without `aria-describedby`); dead `.inspector-playback button:disabled` rule removed (`oi-small-items.md`).
- Compgeo host tests on fake timers; Voronoi playback scheduling contract test (`oi-compgeo-timers.md`). `useStatusReadout.test.tsx` source check accepts CRLF.
- Parametric roll lesson play/replay under reduced motion shows the completed roll (`oi-roll-reduced-motion.md`). Epicycle part of that item was stale: it has no lesson animation action and its Play is blocked under reduced motion.
- De Casteljau curve commands pause a run; Preset load already did (`oi-decasteljau-run.md`); smoke `oi-smoke-decasteljau-readout.md`.
- Empty `FunctionReadout` renders no list; `.inspector-reveals-title` moved to `ReadoutParts.css` (`oi-readout-heading.md`).
- Stale Preset notice cleared on a clean remount (`oi-preset-notice.md`).
- `TriangulationGraph.tsx:374` throw: closed by decision, an invariant guard behind `checkPersistedPreset` and the file importer, which refuse first with a localized message.

## Next

1. Check hosted CI for the last publish (fourth handler's commits `395492f6..84533dfc` plus the docs commit; `just ci <pushed sha>`) and record it.
2. Open items below as small slices, two at a time in disjoint files; smoke when a control or route changes. Give smoke workers a unique evidence file name.

## Open items

- **Refusals that pre-format numbers:** other graphs may format numbers into refusal params at refusal time, like Insertion did; they keep the old decimal separator after a language switch. Search `refusals.refuse(` callers and pass `() => message(...)` where params hold formatted numbers.
- **Stored graph state type:** `Preset.graphState`/`CheckedPreset.graphState` claim `BaseGraphState` but stored state may lack `initialized`; type it as a partial record and drop `as BaseGraphState` in `PresetImport.ts:83` (touches every `figurePresetGraphState` override, so one owner).
- **Step 8 leftovers:** `BaseGraph.sceneSlot` not cleared in `unmount` (inert); `constructOrSweep` only on Blossom/NURBS, the curve-layer constructor `AbstractJXGPointControlledCurve` still leaks points if it throws; Blossom always rebuilds on import; the empty `initialize()` overrides remain; Blossom Preset reopen sub-pixel axis-tick path difference (not a defect).
- **Step 9 leftovers:** rival collection for the same storage key unchecked (`registrationIntegrity.test.ts:65-77`); `scripts/ci-change-scope.cjs:17` hard-codes `projective-cross-ratio` among representative lesson ids; `transient-state-scope.cjs`, `smoke-catalog.cjs` and the clip probe still parse source text; projective smoke ran in Slovenian only.
- **Step 7 review leftovers:** `as D`/`as S` in `importPreset` (the `checkPreset` graph-state cast is the item above); point-set instance vs canonical collections; Hermite `consumerRefusal` redundant; consumer limits in point-set/function/patch/projective `importPresetData` not audited; `ConsumerPreparation.test.tsx` `undefined as never`; no FivePoint degenerate-model `lastUnique` test; figure-batch `finish` sets no initial view for a view-less Preset.
- **Step 5a:** lesson card scrolls with the page (ADR 0003); Bézier last-frame focus and EN hide/reopen not smoked.
- Step 6 risks: focus kept across the breakpoint only when focus fell to the body (`PlaybackButtons.tsx`); Euler has no Play; collision playgrounds and lesson-only patch sweeps inline; Epicycle time slider candidate for a live disclosure; `100svh` with real browser chrome unverified; 360 × 640 board at its 200 px floor with Reset below the fold on 20 routes.
- Decision 57: legacy selected-curve panel (`BaseCurveGraph` `getSelectedCurveCommands`, `onChanged` = `store.notify`) cannot tell an applied operation from a preview, so it does not pause a De Casteljau run; Add/Delete-points board clicks that edit nothing pause it (minor). Collision playground autoplays in view; Play out of view does nothing.
- Test debts: `sharedControls.graphs.test.tsx` per-graph restore. Step 9's "rival collection for one storage key" looks covered now (`registrationIntegrity.test.ts:52-61` and the unique-key check at 73-77); confirm and close.
- Carried: `ChoiceSelect` clipped at 200 % text (one `test.fail`); the count setter's refusal ignores `ReplacementRevision`; no screen-reader run, Chromium only. Curve workspace `onAdd` never refuses; no De Casteljau export check.

## Risks and working notes

- The machine is slow while a worker runs `check-changed` or a smoke: shell calls time out at 120 s and move to the background; read results from the task output or `.command-logs`.
- Working Playwright patterns: `.command-logs/s7-closeout-smoke/run.cjs`, `s89-smoke/`, `s5a-smoke/` in the clean worktree (storage key `bezeg-2.0:preset-<collection>` with `{data:[…]}`, Preset save under "Shrani"; ThreeViews sliders hide while the Save tab is open).
- Read smoke "failures" before acting: they are often harness, by-design or pre-existing (a heading margin from `.inspector-group h3` specificity).
- A shell call that lists, diffs or commits can take minutes while a worker runs tests; prefer the Read/Grep tools, and run git in the background.
- Workers that hit HANDOFF and leave background work: wait for or stop them before a continuation edits the same files. Smoke workers: say "MUST write" the evidence file.
- Line endings: many files have CRLF working copies with clean status; leave them.
- CSS-source tests do not prove the cascade: check specificity against `.workspace-inspector .tools .btn` (0,3,0) and `.demonstration-workspace button` (0,1,1), and smoke-measure.
- `check-changed` "selector removed" warnings for `.visually-hidden` and fixture `data-testid` are false positives.
- Ports: 4317 Codex, 4327 previews, 4328 the controls fixture.

## Settings

Handler budget 1.5x (`BEZEG_HANDLER_BUDGET_SCALE` in this worktree's untracked `.claude/settings.local.json`): BUDGET SOFT about 262k, BUDGET HANDOFF about 322k for Opus. Launch with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`. Each handler launches its successor the same way at handoff and passes this rule on. Routing per the handler card; worker cap per the parallel plan.
