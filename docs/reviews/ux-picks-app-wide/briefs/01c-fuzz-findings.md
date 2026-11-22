# Brief: fix the fuzzer's two findings on master (task 01c acceptance)

Handoff-v13. Role: `bezeg-worker`, Sonnet medium. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`. Do not commit.

## Goal

`just fuzz` must pass on the pilots (acceptance: 50 seeds per route). Two shrunk failures block it; fix both in app code with unit tests. Sources: `docs/specs/parameter-writes.md` (acceptance 4: "Esc stills everything"; requirements on holds and leases), the arbiter doc comment in `src/graphs/base/writes/parameterArbiter.ts`, `scripts/fuzz/README.md` (how to run and replay).

Cases (replay each with `node scripts/fuzz/fuzz.cjs --base http://127.0.0.1:4482/bezeg-2.0/ --replay <file> --repeat 3`; the dev server is running, do not start or stop servers):
- `scripts/fuzz/cases/findings/min-bezier_decasteljau-2.json` and `-4.json` (I3): Play, then Esc: playback keeps running.
- `scripts/fuzz/cases/findings/min-analysis_phase-portrait-4.json` (I1): Play, then a pointer drag on slider `s1` (find which parameter that is): its value keeps advancing about 0.06 per sample after the learner's drag. Task 01's rule: a learner touch of a playing parameter's control (a hold, or a learner write) ends the lease and pauses playback.

## Settled (handler)

1. **Esc** (new behaviour, from the spec): each mounted graph listens for `keydown` Escape on `window`, registered through its `GraphSession` (`registerCleanup`), so teardown removes it. It does nothing when the event is `defaultPrevented` or its target is inside `[role=dialog]`, `dialog`, `[role=menu]`, `[role=listbox]` or an open combobox popup (those own Esc). Otherwise: `runAs("learner", () => { this.pausePlayback(); this.parameters?.endAllLeases("learner"); })`. Check first how Esc is used today inside the board (curve editing, lesson overlay, presentation mode) and keep those behaviours: they run first and may `preventDefault`; report any conflict with `file:line` instead of changing it.
2. **Phase portrait**: find why the drag does not end the lease (the slider's hold not wired to the arbiter, the drag writing another key, or a setter path that bypasses the pause), and fix it in the graph or the shared slider binding by the task 01 pattern (`docs/reviews/ux-picks-app-wide/briefs/01-bind-pilots.md` for how pilots bind holds). If the cause is shared (all pilots' sliders), fix it once in the shared place.

## Owned paths

`src/graphs/base/BaseGraph.tsx` (Esc listener only), `src/graphs/dynamics/PhasePortraitGraph.tsx`, the shared slider/hold binding if that is the cause, and their tests (new test files preferred). The all-graph suites are handler-owned: they must pass unchanged.

## Checks

- Unit tests: Esc pauses a playing pilot and ends its leases (observed failing before the listener exists); Esc inside a dialog does not; the phase-portrait drag-while-playing case (observed failing before the fix).
- Both replays pass 3/3 after the fix (report the output lines).
- `just unit src/graphs/base src/graphs/dynamics src/graphs/curves/bezier` (foreground, timeout 600000), `npx tsc --noEmit --pretty false`, `just lint`.

## Return (at most 300 words)

Root cause of each finding (`file:line`); the change; tests and their observed failures; replay results; any Esc conflict found. Handoff note if you stop early: `docs/reviews/ux-picks-app-wide/notes/01c-fuzz-findings.md`.
