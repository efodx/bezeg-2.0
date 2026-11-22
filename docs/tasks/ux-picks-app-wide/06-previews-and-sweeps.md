# 06 Previews and sweeps

Source: [parameter writes](../../specs/parameter-writes.md) "Previews"; [board workspace spec](../../specs/ux-picks-app-wide.md) requirement A3. Reference: `src/uxPicks/a19/`, `a29/`, `a3/oscillators.ts` at the frozen commit (behaviour only).

## Goal

Hovering a puck's track, a tools slider's track or a count's − / + shows the graph at that value without touching live state. A parameter can move by itself and stops at once on learner input.

## Slices

1. **Preview mechanism ADR, by measurement.** Build the shadow board (option B) and geometry from state (option A) for Taylor and phase portrait, measure capture cost and frame gaps at 1× and 4× CPU throttle under [the performance plan](../../performance-plan.md), and record the choice in a new ADR. Option C (probing the live board) is listed there as rejected.
2. **Ghost preview** on puck track hover, tools slider hover and count − / +; the tooltip states the value after the click; a press jumps there.
3. **Overview fan** on the puck body, with the puck's help card; counts point to their − / + previews.
4. **Back-off** for graphs whose capture exceeds the budget: capture after a pointer rest in idle time, latest value wins, value shown at once.
5. **Sweep** as an `animation` lease: a range swings a narrower stretch than its whole range by default (owner decision), centred on the value it started from and limited to what keeps the declared content in view, and a graph may declare the swing per parameter; a count steps up and down; several may run; Esc stops all; the running state is visible; the button is quiet on fine pointers and always shown on touch. The sweep does not pause to re-measure after a view refit (a prototype flaw).

## Acceptance

- Parameter-writes acceptance 3: a preview during a sweep, a drag and a morph leaves the scene state object unchanged by reference (unit test), and no frame shows a probed value on the live board (frame sampling).
- Unit tests: a learner write to a sweeping key ends its lease and keeps the learner's value; a held drag, a typed value and a count step each win over a sweep.
- Probe: hover CLS 0 on phase portrait and waves; the board does not refit for a preview.
- Fuzzer with hover, sweep, undo and Esc actions: 50 seeds per pilot route, including the three failure classes listed in task 01.
- Reduced motion: no sweep animation is offered, or it steps without easing (decide with the owner if it comes up).

## Open to the feel slice

How wide the default swing is and how fast it moves; the owner sees it on a preview.
