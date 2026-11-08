# Brief: UI and accessibility review of task 2, P2–P5 (handoff-v13)

**Role:** read-only reviewer. Do not edit source, commit or delegate. You may write only your findings file.

**Diff:** `git diff 9ea84ea7~1..2fc4a346 -- src` plus P2 and P3: `git show 10b37815 44c8b288 --stat` then by file. Summarize by file before reading; read by range. Spec: [shared-graph-controls](../../../specs/shared-graph-controls.md), Owner decisions 2, 9, 11, task-1 decisions 14, 17, 18, task-2 decisions 27–29 only. Another worker is fixing these engineering items now, do not report them: typed add clearing on refusal, pressed reason not refreshing on `min`/`max`, Hermite edit refit, duplicate placement at the limit, curve-workspace refusal surviving Reset, PH `w` refit.

**Checklist** (each item: pass, or finding with `file:line`, expected behaviour, severity)

1. Focus: after add, remove-last, per-row remove, count change and typed commit, focus lands on a sensible, existing element (never `body`); a removed row's focus moves to a neighbour or the add control.
2. `aria-pressed` on mode buttons (add mode, board tool group) reflects state; disabled vs. `aria-disabled` with a stated unavailable reason, reachable by keyboard and screen reader.
3. Live regions: `PointCollection` has two `role="status"` regions (count line and pressed reason; decision 18). Check they do not double-announce, are not empty-then-filled in a way that skips announcements, and that each has a stable accessible relationship to its control.
4. Typed-entry Enter rule: Enter adds when the draft is within `1e-3` of the accepted value; check labels, `inputmode`, error text association (`aria-describedby`/`aria-invalid`), and that blur vs. Enter commit is consistent (decision 2).
5. Layout: 3-axis coordinate rows wrap usefully at 310 px panel width; touch targets ≥44 CSS px on coarse pointers (read CSS; `just controls-fixture` exists on port 4328 if you need rendered evidence, run it in the foreground at most once).
6. Localization: every new visible string comes from `t()` with both `sl.ts` and `en.ts`; Slovenian terms read naturally.

**Return (≤300 words):** findings ranked by severity with `file:line` and expected behaviour; passes in one line each. Full findings (≤80 lines) to `docs/reviews/feature-streams/controls/points-review-ui.md`.
