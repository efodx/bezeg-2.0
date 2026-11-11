# Controls stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [parallel plan](../../../tasks/feature-streams/controls.md#parallel-plan). Evaluation records: the "controls …" entries at the end of [evaluation-log.md](../../../agent-workflow/evaluation-log.md).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-controls`, `worktree-stream-controls`. Run state: **active**. **Every queue row is accepted** (steps 1–9, 3a, 5, 5a). What remains is the open-item list below, as small slices.
- **Do not rebase the stream branch.** Bring it up to date with `git merge origin/master` (clean on 2026-11-11). Publish by cherry-picking new stream commits onto `origin/master` in the clean worktree and running `just publish` there.
- **Clean worktree for checks, previews and publishing:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached. Recipe: `git fetch -q origin && git checkout -q --detach origin/master && git cherry-pick <stream commits>`, `just build`, `just preview 4327` (background), smoke, stop the preview, `just publish --background --recipe runtime --base <origin/master sha> --commits <cherry-picked ids, oldest first>`; result JSON in that worktree's `.command-logs/publish-<head>-*.json`; then `just ci <pushed sha>`.
- **Hosted CI:** `8851a40c` (step 5a) **failed** run 42915643947 (stale guided-lesson smoke); fixed by `42134a5d` green 42923027436. `b73cb14d` green 42928690998; `2e877ae9` green 42930172745; `4f72c86c` (readout, De Casteljau) green 42977976809; `f4f2f1b9` (preset notice, smoke doc, handoff docs) green 42979339585; `ce8fa328` (fourth handler, batch 1) green 42984749642; `91a47af5` (batch 2) **failed** run 42988073725, not ours: F2a's `098b4b66` kinematics test wrote `.command-logs/kin02b-redraw.log` without the directory; fixed by `13db38aa` (mkdir) green 42989882190; `1631233a` (batch 3: decision 70, step 8) **failed** run 42997099435, again not ours: F2a's `8c1b431f` Waves test, same missing `.command-logs`; fixed by `ff64c783` (publish started; check `just ci`). **Publishing:** see the last "Done" line for what was published last and its CI.
- **Standing owner directions** (stream file, Decisions): handlers decide and record, with no confirmation; the README's other stop conditions still apply. Pipeline slices in disjoint files instead of waiting on publish and CI.

## Done in this session (2026-11-11, fourth handler)

- CI recorded for `4f72c86c` and `f4f2f1b9` (both green, above).
- Refusals as status, not alert: **decided** (spec decision 69): `RefusalNotice` stays a polite `role="status"` everywhere.
- `BaseFunctionGraph` reveal heading is `ReadoutHeading` (`395492f6`). `ChapterPage.tsx:135` `role="note"`: closed by decision; it is a chapter-page caveat by the return link, not readout help, and `note` is the correct ARIA role for parenthetic text, so the C27 "no `role=note` on readout help" rule does not apply.
- Test debt: `exampleAndFrame.test.ts` duplicates removed, renamed `ExampleSelect.test.ts` (`0c3db492`).
- Step 7: `isBoundingBox` is a type guard; the two `boundingBox` casts in `checkPreset` are gone (`79b2ce73`). The `as BaseGraphState` cast stays for now: `Preset.graphState` and ~30 `figurePresetGraphState` overrides are typed `BaseGraphState`, while stored state may omit `initialized`; an honest stored-state type is its own slice (below).
- Patches (low), `oi-patches-low.md`: B-spline Insertion refusal now follows a language switch (`RefusalChannel` accepts a `() => Message` refusal resolved at render; `19e0d701`); `PatchPointEditor` keeps a stable point list and knot-drag refusal reasons are tested (`84533dfc`); Derivatives corner select closed as correct (visible `ChoiceSelect` label).
- Call-site refusals: B-spline basis invalid-knot notice resolves at render (`oi-refusal-language.md`). Graph collection identity: `src/graphs/graphCollectionIdentity.test.ts` asserts every graph saves and loads with the registered collection instance (closes step 9 "rival collection" and step 7 "point-set instance vs canonical collections"; `oi-collection-identity.md`). Decision 70 recorded (numbers in messages render late).
- No smoke: the heading and editor changes preserve behaviour, and the Insertion language fix is covered by its unit test. `check-changed` passed on all of it (`.command-logs/2026-11-11T07-40-18-505Z-21420-2b187226.log`).
- Published: batch 1 as `ce8fa328`, batch 2 as `91a47af5`, master CI fix `13db38aa`, batch 3 as `1631233a`, Waves CI fix `ff64c783` (CI above). Batch 4 (Euler list, tooling-test, this handoff) was published at handoff; see Next.
- Decision 70 built (`oi-message-numbers.md`): `messageNumber(value, maxDecimals?)` in `src/localization/index.ts`, formatted by `renderMessage` in the current language; `sameRefusal` compares number params by value; function-family and complex `*Messages.ts` builders and `DerivativeGraph.tsx:64` converted, with language-switch tests (`src/localization/messageNumber.test.ts`, `src/graphs/functions/messageNumbers.test.ts`, `DerivativeGraph.test.ts`). Handler reran the derivative test against the old source; it failed. Remaining sites in the open items.
- Step 8 (`oi-step8-leftovers.md`): `BaseGraph.unmount` clears `sceneSlot` (test in `GraphSceneReload.test.tsx`, observed failure). Empty `initialize()` overrides: closed by decision; `BaseGraph.initialize` is abstract, the two empty ones (Blossom, NURBS) extend `BaseGraph` directly, and `BaseCurveGraph`'s is the curve default.
- Decision 70, second pass: Euler's allowed-step list renders late (`messageNumberList`; handler reran the test against the old source, it failed). `leastSquaresMessages.ts`/`rungeInterpolationMessages.ts` are readout formatters re-evaluated on render, not message builders: closed. No `currentLanguage()` left in message builders.
- Step 9 `ci-change-scope.cjs` hard-coded lesson ids: closed as already guarded (`oi-ci-scope-ids.md`): `ci-change-scope.test.cjs:246-251` checks every id is a spec row, and an unknown id makes `lessonScope` fall back to all lessons. `just tooling-test` now runs `ci-change-scope.test.cjs`.

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

1. Check hosted CI for `ff64c783` (Waves fix) and for the handoff publish (batch 4; the pushed sha is in the clean worktree's newest `.command-logs/publish-*.json`), with `just ci <sha>`, and record both. If master is red from another stream's test, read the failure even though the file is not ours: a superseded run is cancelled, so its owner may not see it.
2. Open items below as small slices, two at a time in disjoint files; smoke when a control or route changes. Give smoke workers a unique evidence file name. Good next pairs: the stored graph state type (one owner, `BaseGraph.tsx` and the `figurePresetGraphState` overrides) ∥ Step 7's Hermite `consumerRefusal` / FivePoint `lastUnique` test; or the step 9 source-text parsers ∥ the patches/test debts.

## Open items

- **Stored graph state type:** `Preset.graphState`/`CheckedPreset.graphState` claim `BaseGraphState` but stored state may lack `initialized`; type it as a partial record and drop `as BaseGraphState` in `PresetImport.ts:83` (touches every `figurePresetGraphState` override, so one owner).
- **Step 8 leftovers:** `constructOrSweep` only on Blossom/NURBS, the curve-layer constructor `AbstractJXGPointControlledCurve` still leaks points if it throws; Blossom always rebuilds on import; Blossom Preset reopen sub-pixel axis-tick path difference (not a defect).
- **Step 9 leftovers:** `transient-state-scope.cjs`, `smoke-catalog.cjs` and the clip probe still parse source text; projective smoke ran in Slovenian only.
- **Step 7 review leftovers:** `as D`/`as S` in `importPreset` (the `checkPreset` graph-state cast is the item above); Hermite `consumerRefusal` redundant; consumer limits in point-set/function/patch/projective `importPresetData` not audited; `ConsumerPreparation.test.tsx` `undefined as never`; no FivePoint degenerate-model `lastUnique` test; figure-batch `finish` sets no initial view for a view-less Preset.
- **Step 5a:** lesson card scrolls with the page (ADR 0003); Bézier last-frame focus and EN hide/reopen not smoked.
- Step 6 risks: focus kept across the breakpoint only when focus fell to the body (`PlaybackButtons.tsx`); Euler has no Play; collision playgrounds and lesson-only patch sweeps inline; Epicycle time slider candidate for a live disclosure; `100svh` with real browser chrome unverified; 360 × 640 board at its 200 px floor with Reset below the fold on 20 routes.
- Decision 57: legacy selected-curve panel (`BaseCurveGraph` `getSelectedCurveCommands`, `onChanged` = `store.notify`) cannot tell an applied operation from a preview, so it does not pause a De Casteljau run; Add/Delete-points board clicks that edit nothing pause it (minor). Collision playground autoplays in view; Play out of view does nothing.
- Test debts: `sharedControls.graphs.test.tsx` per-graph restore.
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
- Other streams' JSDOM redraw-timing tests (F2a) write `.command-logs/*.log`; hosted CI has no such directory, so each needs `mkdirSync('.command-logs', {recursive: true})`. `just unit` creates the directory itself, so a local run cannot reproduce the failure; run the test with no directory present to check.
- Ports: 4317 Codex, 4327 previews, 4328 the controls fixture.

## Settings

Handler budget 1.5x (`BEZEG_HANDLER_BUDGET_SCALE` in this worktree's untracked `.claude/settings.local.json`): BUDGET SOFT about 262k, BUDGET HANDOFF about 322k for Opus. Launch with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`. Each handler launches its successor the same way at handoff and passes this rule on. Routing per the handler card; worker cap per the parallel plan.
