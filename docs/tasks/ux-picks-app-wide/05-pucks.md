# 05 Pucks

Source: [board workspace spec](../../specs/ux-picks-app-wide.md); [ADR 0064](../../adr/0064-source-tagged-scene-writes.md), [ADR 0065](../../adr/0065-graphs-declare-presenters-render.md). Reference: `src/uxPicks/a1/ParamPucks.tsx` and `.css` at the frozen commit (behaviour only; its registry and `set`/`setRaw` paths are not ported).

## Goal

Every declared range and count parameter is a puck in the board's bottom-left strip, rendered from the declaration and writing to the store as `learner`.

## Slices

1. **Puck strip** as a region of the layout function; pucks in declared order; constant puck width (the value box reserves the widest formatted value).
2. **Range puck:** drag left and right, finer when the finger lifts away, drag ruler kept inside the board, wheel, arrow keys with Home/End/PageUp/PageDown, typed entry (double-click, Enter or start typing; out of range refused with a reason).
3. **Count puck:** − and +, keys, typed entry.
4. **Track-jump undo:** "Razveljavi" pill above the strip for 4 s, Esc also undoes.
5. **Help card** per puck from the declared help; tooltips only on hover or keyboard focus.
6. **Other kinds on the board** (owner: placed with taste; "some do make sense as standalones/pucks"): design and build the board form of a `choice` and a `toggle`, as a puck where it fits the strip and as a standalone board control where it does not. Try them on the pilots' real controls (for example linear map's modes and a visibility toggle), show the owner the candidates on a preview, and record the placement rule in the conversion guide.
7. **Controls catalogue:** add the puck to `docs/controls.md` with when to use it; the tools card no longer shows a slider for a parameter that has a puck.

## Acceptance

- Unit tests: a puck write lands in the store in the same tick with source `learner`; a refused typed value leaves the store unchanged.
- Probe on the pilots: no long task on first or later drags, width drift 0, no layout shift while a value changes.
- Fuzzer with puck actions: 50 seeds per pilot route.
- Screen reader names and values; every action reachable by keyboard.
- Lesson frames with locked parameters show the lock and its reason; reading frames stay live.
- Critique: at most two rounds; P1s fixed, P2s fixed or logged here.
