# Brief: shared graph controls, task 1 slice 5b, shared behaviour test (handoff-v13)

**Role.** `bezeg-worker`, tests (and test helpers). Edit only the owned paths; do not commit, push or delegate. Preserve unrelated working-tree changes. Another worker (5a) runs in parallel and owns `eslint.config.mjs` and `docs/tasks/feature-streams/README.md`; do not touch them.

**Goal.** The behaviour half of [task 1 slice 5](../../../tasks/shared-graph-controls/01-foundation.md): spec acceptance 3, "two graphs offering a capability pass the same shared behaviour test: placement, limit, refusal, commit, Escape, keyboard and Reset". Read in the [spec](../../../specs/shared-graph-controls.md): Rule, decisions 2, 3, 7, 13–20, Acceptance. Shared controls: `src/inputs/` (`NumberInput`, `Slider`, `CountSetter`, `BooleanField`/`OnOffSwitch`, `ChoiceSelect`, `stepKeys.ts`, `testEntry.ts`), `src/graphs/base/controls/` (`PlaybackButtons`, `guard`, `LiveReadout`), `src/inputs/RefusalChannel.tsx`.

## Settled decisions

- **B-a One helper.** `src/inputs/sharedControlBehaviour.tsx` (test-only; not imported by app code) exports one function per control kind that registers `it` cases against a caller-supplied mount: `numericFieldBehaviour`, `sliderBehaviour`, `countSetterBehaviour`. Each takes `{mount(): {field: HTMLElement; read(): number; reset(): void; refusalText?(): string | null}, min, max, refusedValue?, placement?: 'edit' | 'display'}` or similar; design the exact shape, keep it small, and document it in the file header.
- **B-b The seven checks.** *Placement*: the control sits in the expected inspector tab (skip with a stated reason when the mount is a bare control). *Limit*: an arrow or Shift step at `max` stays at `max` with no message (decision 7). *Refusal*: a typed out-of-range or model-refused value leaves the value and shows a reason (field hint or `RefusalNotice`, decision 14). *Commit*: typing does not apply until Enter or blur (decision 2); sliders and steppers apply at once. *Escape*: an open draft reverts. *Keyboard*: the shared keymap in `stepKeys.ts` (arrow, Shift+arrow, Home/End where the keymap defines them). *Reset*: the host Reset (`reset()` from the mount) restores the starting value and clears any refusal.
- **B-c Consumers.** Run each helper against the bare shared control **and** two real graphs that offer the capability, using `src/graphs/base/realGraphTestHarness.tsx`. Numeric field: two graphs with a `NumberInput` that can refuse (for example Sequence's threshold field and a Correlation or Interpolation field; grep `NumberInput` in `src/graphs/functions`). Count setter: two graphs with `CountSetter` (for example De Boor and one function graph). Slider: two graphs with a bounded `Slider`. A check that a real graph legitimately cannot meet is a finding: report it with `file:line`, do not weaken the helper and do not change app code.

## Owned paths

`src/inputs/sharedControlBehaviour.tsx`, new test files `src/inputs/sharedControls.behaviour.test.tsx` and `src/graphs/base/sharedControls.graphs.test.tsx` (names may differ, keep them under those directories), the evidence file. No app code.

## Acceptance and checks

1. Every check runs against the bare control and two real graphs per kind, both languages for at least the refusal text.
2. Each check observed failing under a mutation of the shared control (for example, `NumberInput` committing on each keystroke, Escape not reverting, `stepKeys` ignoring Shift); restore every mutation. Logs `.command-logs/5b-mut-*.log`.
3. `just unit` on the new test files and `src/inputs`; `just typecheck`; `just lint` on the new files.

## Return

≤250 words: helper shape, consumers chosen, findings (`file:line`), mutation summary, checks with log names. Evidence in `docs/reviews/feature-streams/controls/foundation-5b.md`.
