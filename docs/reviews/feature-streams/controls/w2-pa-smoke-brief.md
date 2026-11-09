# Wave 2 smoke brief (patches sweep)

Copied from `w2-fc-smoke-brief.md` with the family details changed.

**Role:** `bezeg-smoke`, browser checks only. Do not edit app code; write only your evidence file and scripts under `.command-logs/`. Read `.agents/skills/smoke-tester/SKILL.md` and `docs/smoke-tests.md` (Setup, Evidence and limits).

**Preview:** production build of commit `16adfda5`, served by the handler from the clean worktree with `just preview 4327` at `http://localhost:4327/bezeg-2.0/`. Do not start or stop it. Routes: `/patches/tensor`, `/patches/decasteljau`, `/patches/derivatives`, `/patches/subdivision`, `/patches/joins`, `/patches/triangular`, `/patches/coons` (confirm in `src/demonstrations.ts`). Chromium via the repository's Playwright install; desktop 1280×800 unless a check says 390×844 with touch emulation.

**What changed:** the patch panels moved to shared controls (spec `docs/specs/shared-graph-controls.md`). Expected: control-point choice by index through selects with a "none" entry; the selected point's x, y, z commit on Enter or blur (no Apply button), a bad value refused in the field hint, focus stays in the field after a commit; degrees are −/+ steppers (`.count-setter`) with a typed middle field, 1–4; the starting patch (Tensor, Triangular) and Join scene are a select with a "custom" entry only after an edit; one shared View group (front, top, side, isometric, Reset view, azimuth and elevation sliders); Subdivision's Elevate stays focusable when unavailable and states its reason; Derivatives' corner is a select showing the current corner or "not at a corner"; Coons and Derivatives status lines are visible text announced once through a hidden polite region (`[data-readout-live]`) after an edit settles.

**Per route, five checks:** (1) loads with board and inspector, no console errors; (2) each migrated control in your list changes the board or readout as named (choose a point, type a coordinate and press Enter, step a degree, pick a starting patch, a camera preset and Reset view); (3) one refusal or unavailable reason shows its text once; (4) keyboard: Tab to the control, operate it with keys, visible focus; (5) language switch SL→EN→SL keeps the scene and relabels the control. On two routes per group also check 390×844 with touch emulation: the Edit tab is usable and steppers are at least 44 CSS px.

**Your routes** are in the dispatch message. For each: record passed, failed, blocked or skipped per check with observed evidence; failures with reproduction steps and a screenshot path under `.command-logs/w2-smoke-<group>/`.

**Return** ≤300 words: a table of route × check results, failures first with repro, coverage gaps. Full evidence: put it in your return's tail if you cannot write files outside `.command-logs/`, else to `docs/reviews/feature-streams/controls/w2-smoke-<group>.md`.
