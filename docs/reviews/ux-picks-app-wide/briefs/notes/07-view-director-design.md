# Task 07 slice 2: view director design (handler 6, 2026-11-24)

Source: [task 07](../../../../tasks/ux-picks-app-wide/07-morph-and-view-director.md) slice 2 and its acceptance; prototype design `git show ux-picks:docs/reviews/ux-picks/view-fit.md` (behaviour to keep, not code). Fit core: `src/workspace/view/` (slice 1, `briefs/notes/07-fit-core.md`). Writes: `src/graphs/base/writes/viewAdapter.ts`, `parameterArbiter.ts`, `writeSource.ts`.

## Where it runs

- Only on a board whose graph declaration has `marks` (absent: the graph keeps its own view logic, never fitted), whose main view adapter is bound to the arbiter as `view` (the pilots), and which is not a surface demonstration (`demonstration.view === 'surface'`).
- One director per graph session's main board. Auxiliary boards are never fitted.

## Shape

- `src/workspace/view/viewDirector.ts`: a framework-free class `ViewDirector`. Constructor dependencies (all injectable for tests): the `ViewAdapter`, the `ParameterArbiter`, a `marks()` getter, `equalAxisUnits` (default: the intent's `keepAspectRatio`), `now()`, `requestFrame`/`cancelFrame`, `reducedMotion()`, the global switch store. `dispose()` ends its lease, cancels the frame, removes every subscription; idempotent.
- Inputs: `setGeometry({canvas, free, obstacles})` from the layout (`freeRect(layout)`, `obstacleRects(layout)`), `frameChanged()`, `resized()`, `fitNow()` (the fit button), `setDragging(boolean)` (card drag in BoardCards).
- React wiring: one hook (for example `useViewDirector`) in `BoardCards.tsx`, which already has the layout result, the board size and the card drag. It creates the director when the gate holds and disposes it on unmount or when the gate stops holding.

## The fit

1. `fitIntent({intent: adapter.intent().box, canvas, free, equalAxisUnits})`. It reads only the intent, never the shown box: repeated fits of an unchanged state return the same box (no drift).
2. If any `must` mark is still covered in that box (`coveredMarks(box, must points, canvas, obstacles)`), use `fitView` in `keep` mode with the must and nice marks, `base` = the intent, `free`, the default limits instead.
3. A target equal to the last target (relative tolerance 1e-9 of the box size) does nothing: no glide, no write.
4. A fit never calls `setIntent`; it shows the box with `adapter.setFitted(box, lease)` only. A fit equal to the intent clears nothing and writes nothing.

## Motion

- Lease: `arbiter.lease(['view'], onEnd)` per glide; a new glide replaces the old one (the arbiter ends older leases on the same key).
- Glide: 250 ms, ease-out cubic, from the shown box to the target, interpolating the four box edges, one `setFitted` per animation frame. Reduced motion: one `setFitted`, no glide.
- Resize: jump (no glide), because a resize arrives continuously.
- Never during a drag: while a learner span is open (`activeGesture() !== undefined`) or a card drag is active, a trigger only marks the director pending; the gesture end (`onLearnerGestureEnd`) or the card drop runs the pending fit once.

## Triggers

| Trigger | Source | Fit |
| --- | --- | --- |
| load | first `setGeometry` after creation | jump |
| lesson frame change | `frameChanged()` (BoardCards' frame identity changes); also resumes a paused director | glide |
| board resize | `resized()` (board size changes) | jump |
| card rectangle change | `setGeometry` with a free rectangle or obstacles changed by more than 1 px (open, fold, drop, measured height) | glide |
| released parameter | learner gesture end that changed a parameter: refit only if a `must` mark is covered in the shown box (owner's Samodejno rule; avoids abrupt release refits on Taylor) | glide |
| intent changed by a lesson, Reset or Preset | adapter `subscribe`, change attributed to `lesson` or a non-learner write | glide |

## Pause and resume

- A learner pan or zoom ends it: the board's own view change becomes the intent in the adapter (`boardChanged`) and clears `fittedBox`. The director marks itself paused when the adapter reports an intent change it did not cause and that is not a `lesson` write, or when its lease ends with reason `learner`. While paused, triggers do nothing; the view is the learner's.
- The fit button (`navigate('fit')`, "Prilagodi točkam") clears the pause and fits now, even when Samodejno is off (one-shot). A new lesson frame clears the pause too.
- Samodejno: one global switch, stored in `localStorage` under `bezeg.view.autofit` (default on; storage errors fall back to on). Off: no automatic trigger fits; the fit button still does. Shown as a toggle button with `aria-pressed` in the board's navigation group, next to the fit button. Its styling is the owner's at the feel check.

## Not the director's

- Presets and exports store the intent only; a fitted box never reaches the export (check).
- Morph (slice 3), state-following intent (slice 4) and removing the old `BaseGraph.fitView` (slice 5).

## Tests (unit, fake board and fake clock)

- A learner pan during a glide ends it, the view and the intent are the learner's, and later triggers do nothing until the fit button.
- A fit never changes `adapter.intent()`.
- Two fits of an unchanged state write once and return the same box.
- No write while a learner span is open; exactly one fit at its end.
- Reduced motion: one `setFitted` per fit.
- Gate: no director without marks, on a surface demonstration, or with an unbound adapter.
- Disposal: no frame callback or subscription survives `dispose()`.

## Marks on the pilots (slice 2b, after 2a is accepted)

The director needs declared marks. 2a adds the director with Taylor's marks as the worked example (curve sample of the function and the polynomial over the visible interval, the expansion point as `must`). 2b declares marks on the other 2D pilots (transformations, De Casteljau, linear map, phase portrait) from one shared brief.
