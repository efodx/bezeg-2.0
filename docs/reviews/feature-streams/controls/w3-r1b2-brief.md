# Wave 3 slice R1b, continuation brief

Continue R1b from the handoff note in `w3-r1b.md` (read it first, then `w3-r1b-brief.md` and `w3-common-brief.md`). Same owned paths as `w3-r1b-brief.md`. Repair 3 (`w3-repair3-brief.md`) may still be editing `BezierCurveControls*`, `RationalBezierCurveControls.tsx`, `src/inputs/PointCollection*` and the `useStatusReadout(...)` lines of compgeo `*Controls.tsx`: leave those alone and ignore their failures.

## Handler decision on C27-12

`bisection_board_progress`, `root_finding_board_progress` and `fixed_point_board_progress` are board labels that name the iteration index k of the sequence term (k = 0 is x₀) with no total. They are not "k of n" counters and stay as they are; the handler records this against decision 65. Do not change them.

## Work

1. **C27-10:** `src/learning/playground/collisions/CollisionInspect.tsx:244-276`: the hand-written counter (around :249) uses `StepCounter` with `noun="event"` (keep its `data-*` hooks via `hooks`); the visible regions with `role="status"` become plain readout text, and the inspect view announces through one `LiveReadout` (settled, muted while playing) as decision 63 asks. Grep `tests/` and `src/learning` for readers of the changed hooks first.
2. **Mutation evidence still missing:** one observed failure each for a patch panel `ReadoutHelp` conversion (put `role="note"` back), the Epicycle scroll-table wiring and the Bezier clipping scroll-table wiring (add a wiring test if none exists, then revert the wiring), and the vertical-scroll measure in `ReadoutScrollTable` (keep the `scrollHeight` part only if a test covers it; otherwise remove it, since it goes beyond items 6–8).
3. **Checks not run yet:** `just typecheck`, `just lint`, `just unit` over every touched directory in one run (functions, patches, projective, complex, linear, compgeo `readoutParts`, collisions), and the lesson tests that read these hooks (projective lessons, linear maps and complex maps chapters, Fourier and Epicycle content). Fix failures in your owned paths.

Record observed failures in `w3-r1b.md` as you go, under a "Continuation" heading. Return ≤250 words: done/not done, `file:line`, checks with results, observed failures. On `HANDOFF`, write done/remaining there and stop.
