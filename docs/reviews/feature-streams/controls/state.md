# Controls stream state

Read this and the [handler card](../../../agent-workflow/handler-card.md), then the [parallel plan](../../../tasks/feature-streams/controls.md#parallel-plan). Evaluation records: the "controls Wave 3, …" entries at the end of [evaluation-log.md](../../../agent-workflow/evaluation-log.md).

## Where things are

- **Worktree and branch:** `.claude/worktrees/stream-controls`, `worktree-stream-controls`. Run state: **active**. Step 5 (task 4) is **accepted** and on `master`. Step 6 (phone playback) is in progress.
- **Local, not pushed (step 6):** `3aff64e3` (s6a: slot core, pilots fixed point and De Casteljau), `a2af3f47` (s6a review fix: slot dimmed in lesson-content mode), `64e2c0c2` (s6b: rollout to 21 more playback groups), then the handoff docs commit. The handoff docs commit was also pushed alone (cherry-picked onto `origin/master` from the clean worktree), so its patch is already upstream. When you publish step 6, declare `--base 72d7d578` and every commit in `72d7d578..HEAD` (the three step 6 commits, the handoff docs commit, and yours); the rebase drops the already-applied docs patch. If `just publish` refuses that, read its recovery section in `docs/commands.md`.
- **Clean worktree for checks and previews:** `.claude/worktrees/agent-a18d8a9709fec93af`, detached; it may still be serving `72d7d578` on port 4327 (a background `just preview` of the previous handler; stop any process on 4327 first, then `git checkout --detach <commit>`, `just check-changed <base>`, `just preview 4327`). Publish from the stream worktree with `just publish --background --recipe runtime --base <commit> --commits <ids>`, then `just publish --status` / the result JSON, then `just ci <pushed sha>`.
- **Hosted CI:** `68771cb0` (Wave 3 through repair 3) green, run 42717545564. `de8b05c4` (R1b, Apply 44 px) green, run 42734495527. `62730f3d` (C29/C30) green, run 42740748799.
- **Standing owner directions** (stream file, Decisions): handlers decide and record, with no confirmation; the README's other stop conditions still apply. Pipeline slices in disjoint files instead of waiting on publish and CI.

## Done in this session (2026-11-09/10)

- Smoke E (O1 operation panel, compgeo readouts) found four defects; repair 3 (`441a42a2`, `7d699050`, `2f0017c0`, `88d01b2e`, `bf0f384b`) fixed them: Apply/Reset weight reasons visible on press, 44 px Apply (a rule losing on specificity), settled trace readouts (decision 66), point count announced only after this panel's own press. Smokes `w3-smoke-e.md`, `w3-smoke-r3.md`, `w3-smoke-f.md`.
- R1b (`f72c6526`): readouts outside compgeo on the shared parts; C27-12 board labels exempt (decision 65 note). Reviews found two blocking regressions in Collision Inspect, fixed by the handler. Evidence `w3-r1b.md`.
- C29/C30 (`7dcdc1cf`): one key per shared label (decision 67), shared `control-row` (decision 68). Evidence `w3-c29.md`, `w3-c30.md`, `w3-smoke-g.md`.
- Task 4 closeout: `just check` passed at `72d7d578`; full checklist in both languages `w3-closeout-smoke.md`; queue row 5 accepted.
- Step 6 items 1–2: `graph-adjacent-controls.screenshots.md` (before: playback and graph never visible together in portrait on 11 of 13 routes), `graph-adjacent-controls.prototype.md`, layout decision in `docs/specs/mobile-graph-playback.md` ("Layout decision").

## Next

1. **Verify step 6 s6a + s6b:** in the clean worktree, `just check-changed 72d7d578` at the step 6 head (the three commits), serve it, then two smoke workers from `w3-s6-smoke-brief.md` (group A route matrix: Sonnet; group B conditions plus baseline: Sonnet). Fix red, then publish and `just ci`. The shared workspace changed, so group B includes the baseline checklist.
2. Step 6 item 5: update workspace guidance (`docs/ui-functionality.md` playback section, if any; `graph-adjacent-controls.md` completion evidence with the route/action matrix), then mark queue row 6 done.
3. Then the open items below as one small slice, or step 7 (Wave 4) per the parallel plan; step 5a stays gated on Codex's lesson navigation (check `origin/master`).

## Open items

- **Live-region count on point-set graphs:** `PointSetControls.tsx:75,84,222` mounts `StatusLive` for its status and pending lines, so Delaunay has three `[data-readout-live]` and Bezier clipping two, against decision 18's one region per graph. Fold them into the graph's `LiveReadout` or make them notice regions that stay empty until something happens.
- Step 6 risks: focus kept across the breakpoint only when focus fell to the body (`PlaybackButtons.tsx`); Euler method has no Play and stays inline; collision playgrounds and lesson-only patch sweeps stay inline; the Epicycle time slider is a candidate for a per-route live disclosure (variant B); `100svh` with real browser chrome and scrolled pages unverified.
- `ReadoutHeading` relies on `.inspector-reveals-title` in `functions/FunctionReadout.css`; empty `FunctionReadout` rows render an empty `ul`; `ChapterPage.tsx:135` keeps `role="note"` (learn-ui stream).
- Decision 57 gaps: De Casteljau curve commands and Preset load leave a run going; lesson `play` of parametric roll and Epicycle ignores reduced motion. Collision playground autoplays in view; Play out of view does nothing.
- `.inspector-playback button:disabled` rule: check whether any native `disabled` remains in Voronoi/Delaunay (C6).
- `NumberInput` integer hint lacks "whole numbers"; `UnavailableButton` `title` plus hidden description can be read twice.
- Patches (low): Derivatives corner `aria-label`; `PatchPointEditor` new `points` array each render; Insertion refusal separator after a language switch; knot editor drag refusal reasons unchecked.
- Test debts: `VoronoiGraph.host.test.tsx` "schedules no timers" predates `TracePlayback`; duplicates in `frameFit.test.ts`/`exampleAndFrame.test.ts`; `sharedControls.graphs.test.tsx` per-graph restore; three compgeo host tests wait 600 ms real time for the settle period (fake timers would be faster).
- Carried: `ChoiceSelect` clipped at 200 % text (one `test.fail`); the count setter's refusal ignores `ReplacementRevision`; no screen-reader run, Chromium only. Curve workspace `onAdd` never refuses; no De Casteljau export check.

## Risks and working notes

- Line endings: about 1,400 files in this worktree have CRLF working copies with clean status (an earlier worker rewrote them; the checkout should be LF per `.gitattributes`). Leave them: a bulk delete-and-checkout runs file by file on Windows and the classifier blocks `git checkout --`. Edits through the Edit tool and `git add` normalise to LF.
- Workers that share a checkout: name owned regions (worked for C29 labels vs C30 classes in the same tsx files). A worker that stages a deletion (`git rm`) puts it in the index: commit other docs with a path-limited `git commit -- <paths>`.
- Smoke workers sometimes skip their evidence file; say "MUST write" in the prompt.
- CSS-source tests do not prove the cascade: check specificity against `.workspace-inspector .tools .btn` (0,3,0) and `.demonstration-workspace button` (0,1,1), and smoke-measure.
- `check-changed` "selector removed" warnings for `.visually-hidden` and fixture `data-testid` are false positives.
- `just publish` needs the declared commits to be exactly `<base>..HEAD`.
- Ports: 4317 Codex, 4327 previews, 4328 the controls fixture.

## Settings

Handler budget 1.5x (`BEZEG_HANDLER_BUDGET_SCALE` in this worktree's untracked `.claude/settings.local.json`): BUDGET SOFT about 262k, BUDGET HANDOFF about 322k for Opus. Launch with `claude --bg --agent bezeg-handler --model opus --permission-mode auto --effort medium`. Each handler launches its successor the same way at handoff and passes this rule on. Routing per the handler card; worker cap per the parallel plan.
