# Wave 2 review: functions and curves sweeps, UI and accessibility

`bezeg-reviewer`, read-only. Do not edit files. Report findings with `file:line`, severity and the expected behaviour.

**Diff:** the uncommitted working tree plus commits `b09c6de8` and `bf77d72e` in `.claude/worktrees/stream-controls`, limited to `src/graphs/functions/**`, `src/graphs/curves/**`, `src/graphs/base/**`, `src/inputs/CountSetter*`, CSS files and the `sl.ts`/`en.ts` keys they use. Start with `git diff --stat`.

**Sources:** spec `docs/specs/shared-graph-controls.md` (*Acceptance*, I1–I5 via workstream 1: find "I1" in `docs/specs/`), `docs/localization.md#choosing-new-terms`, AGENTS.md product constraints (graph prominent, understandable controls, Slovenian default), evidence files `w2-f1.md`, `w2-f2.md`, `w2-f3.md`, `w2-k1.md`–`w2-k4.md`.

**Check:**
1. Labels and names: every new control has a visible label or accessible name that says what it sets, in both languages; `CountSetter` −/+ names fit the quantity (rational weight uses `minusLabel`/`plusLabel`); new Slovenian strings are natural and use established terms (`bsp_example_reset`, `bsp_point_list`, `bsp_degree_needs_points`, `select_a_curve_to_use_this_mode`, `lines_need_offset_control_points`, `conic_weight_*`, the reworded curve-selection hint).
2. Unavailable states (I2): reasons are visible and linked (`aria-describedby`), not native `disabled`, except the three `OnOffSwitch` cases (Runge semicircle, PH offset lines, Subdivision limit), which the handler will fix with a shared prop: note any others.
3. Announcements: one live region per graph; visible status groups keep their look (`FunctionStatus` class names and the per-graph CSS such as `.epicycle-status`, `.taylor-status`).
4. Typed point lists on curve boards (K2's `BSplinePointList`, K4's seam): list title and row names identify the curve and point; on multi-curve boards, which curve is listed is clear; the list does not crowd the Edit tab at 390 px (read CSS and layout code; say what needs a browser check).
5. Touch targets: new buttons and steppers reach 44 CSS px on coarse pointers (`CountSetter.css`, `UnavailableButton` styles).
6. Removed controls (local Resets, fit-view buttons, "whole view", Epicycle −1/+1): nothing left that refers to them in help text, lesson text or prompts (`grep` the old labels in `src/learning`).

**Return:** at most 350 words, by severity, with a list of what needs a browser check; full list in `docs/reviews/feature-streams/controls/w2-fcu.md` if you can write it, else in your message.
