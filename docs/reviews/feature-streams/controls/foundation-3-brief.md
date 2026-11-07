# Brief: shared graph controls, task 1 slice 3 (handoff-v13)

**Role.** `bezeg-worker`, implementation and tests. Edit only the owned paths; do not commit, push or delegate. Preserve unrelated working-tree changes.

**Goal.** [Task 1 slice 3](../../../tasks/shared-graph-controls/01-foundation.md), announcements (C21): one shared `LiveReadout` with one mute-during-Play rule and one marker that `controlsSignature` reads, piloted on the two graphs that have no Play gate today. Read in the [spec](../../../specs/shared-graph-controls.md): row C21, its evidence note (search `**C21:**`), decisions 13–17. `AGENTS.md` localization and context-economy rules apply.

## Settled decisions

- **S-a Shared place.** Move `src/graphs/curves/LiveReadout.tsx` (and its test) to `src/graphs/base/controls/LiveReadout.tsx`; update the six curve graphs' imports (grep `LiveReadout`). `SettledReadout` keeps its behaviour.
- **S-b Mute rule.** `LiveReadout` gains `muted?: boolean`. While muted the region is present and empty; the `SettledReadout` keeps tracking. On unmute the current published text appears at once (so Pause or the end of a run announces the state once). No timers start while muted beyond what `report` already does. This is the one rule; callers pass `muted={playing}`.
- **S-c One marker.** `data-readout-live` stays the only marker; `controlsSignature` (`src/graphs/base/realGraphTestHarness.tsx` ~line 192) keeps excluding it. Update its doc comment to name the mute rule.
- **S-d Unavailable in the signature.** `controlsSignature` reports an input with `aria-disabled="true"` like a disabled one (`:disabled`), and adds `button[aria-disabled="true"]` lines as `button:<text>:unavailable` (buttons with `aria-pressed` keep their line, gaining `:unavailable` when so marked). Tests compare two observations, so fix only real mismatches this exposes; report any.
- **S-e Pilots.** De Boor (`src/graphs/curves/bspline/DeBoorGraph.tsx`, `data-deboor-status="levels"`) and Sequence (`src/graphs/functions/SequenceGraph.tsx`, the `demo-status` group): the visible status stays visible but loses `role="status"`/`aria-live`; a `LiveReadout` (owned `SettledReadout`, `report` on render or state change, `cancel` on unmount, `muted={playing}`) carries the announcement. Keep `data-deboor-status` / `data-sequence-status` markers. Third pilot, compgeo: `src/graphs/compgeo/HullTraceControls.tsx`'s hand-written hidden paragraph (`data-hull-trace-live`) becomes a `LiveReadout` with `muted={playing}`; keep the `data-hull-trace-live` attribute on the region if a test or smoke spec reads it (allow `LiveReadout` an optional extra data attribute or `id`, nothing more). The other nine compgeo panels and the function status groups migrate in their family sweeps: do not touch them.
- **S-f Field hints.** `NumberInput`'s hint (`src/inputs/NumberInput.tsx` ~line 216) is inserted with its text, so it may not be announced. Make the hint container always mounted: a role-less `<div aria-live="polite">` wrapper (no margin when empty), containing the `<p id={hintId} className="number-input-hint">` only while there is a hint; the `<p>` drops `role="status"`. Reason: `LookUnderneath.test.tsx` counts `role="status"` per controls area, and the rule is one *readout* region per graph; notice regions (field hint, `RefusalNotice`, `PlaybackButtons` reason, `CountSetter` status) stay empty until something is refused, so they never speak unprompted. Update tests that found the hint by `getByRole('status')` (12 files: grep `Vnesi vrednost med\|ni mogoče uporabiti\|number-input-hint`) to query the hint by its id or class. Check `CountSetter`, which reuses the hint.

## Owned paths

`src/graphs/base/controls/LiveReadout.tsx` (+ test, moved), `src/graphs/curves/LiveReadout*` (removed), the six curve graphs' imports, `DeBoorGraph.tsx`, `SequenceGraph.tsx`, `HullTraceControls.tsx`, `src/inputs/NumberInput.tsx`, `src/inputs/CountSetter.tsx`, `src/graphs/base/realGraphTestHarness.tsx`, CSS for the hint wrapper if needed, and the tests of all of these plus the hint-query test updates. Nothing in `sl.ts`/`en.ts` should be needed; if it is, keep both in lockstep.

## Acceptance and checks

1. `LiveReadout` unit test: muted → empty region; reports while muted; unmute → current text at once; still settles 500 ms when unmuted.
2. De Boor and Sequence: during Play the live region is empty; after Pause it holds the current status. Before your change their status changed on each step during Play (observe it failing on the old code). HullTrace keeps its existing behaviour (its host test passes).
3. `controlsSignature`: a unit test showing an `aria-disabled` input and button appear as unavailable.
4. `NumberInput`: the wrapper exists before any hint; a rejected commit puts the text inside it; `aria-describedby` still names the hint `<p>`. `LookUnderneath.test.tsx` still finds one status.
5. Every new assertion observed failing under a mutation; logs `.command-logs/3-mut-*.log`.
6. `just unit` on touched directories plus `src/learning/playground/LookUnderneath.test.tsx`, `src/graphs/base` and the order tests that pin inspector children (`DarbouxGraph.test.ts`, `DefiniteIntegralGraph.test.ts` "Edit order"); `just typecheck`; `just lint` on touched files. Then once, last, in the background: `just check-changed` (log `.command-logs/3-check-changed.log`; 30–50 min under load).
7. Smoke on port 4327 (read `.agents/skills/smoke-tester/SKILL.md`, `docs/smoke-tests.md`, `docs/commands.md`): the De Boor, Sequence and hull-trace routes (Play, Pause, a refused typed value in a `NumberInput`), lesson rows that use them (grep `tests/guided-lessons.smoke.spec.cjs` and `src/learning/content` for `deboor`, `sequence`, `hull`), and `tests/curve-ownership.smoke.spec.cjs`. Stop previews you start.
8. Screenshots of a visible field hint and of the De Boor status in light, presenting and forced colours into `.command-logs/3-shots/`. Wait ≥800 ms after toggling `is-presenting`. The inspector is hidden while presenting: use the page's own presenting layout, not a class toggle on a hidden panel; say if a shot cannot show inspector content.

## Return

≤300 words: changes per file, decisions beyond S-a–S-f, mutation summary, checks with log names, gaps. Full evidence in `docs/reviews/feature-streams/controls/foundation-3.md`; on `BUDGET HANDOFF` write it there marked partial, listing exactly which checks did not run. Ask for expensive checks only once, at the end.
