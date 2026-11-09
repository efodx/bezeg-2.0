# Wave 2 smoke brief (functions and curves sweeps)

Copied from `w2-smoke-brief.md` with the family details changed.

**Role:** `bezeg-smoke`, browser checks only. Do not edit app code; write only your evidence file and scripts under `.command-logs/`. Read `.agents/skills/smoke-tester/SKILL.md` and `docs/smoke-tests.md` (Setup, Evidence and limits).

**Preview:** production build of commit `5e2bfc47`, served by the handler from the clean worktree with `just preview 4327` at `http://localhost:4327/bezeg-2.0/`. Do not start or stop it. Resolve routes from `src/demonstrations.ts` (catalog ids). Chromium via the repository's Playwright install; desktop 1280×800 unless a check says 390×844 with touch emulation.

**What changed:** the panels moved to shared controls (spec `docs/specs/shared-graph-controls.md`, decisions 41–49). Expected: status lines look as before but are announced once through one hidden polite region (`[data-readout-live]`) after an edit settles; a refused typed value shows its reason once, under its field; unavailable buttons, sliders and switches stay focusable (`aria-disabled`) and show their reason; −/+ count steppers (`.count-setter`) with a typed middle field; the local Reset buttons of inverse, transformation, zeros, rational and Blossom are gone, as are the Binomial/Density "fit the view" and Fourier "whole view" buttons (host Fit frames the same); curve boards have a typed point list in Edit ("Krivulja N: točke" on multi-curve boards); the curve-selection hint says a selected curve moves from its frame.

**Per route, five checks:** (1) loads with board and inspector, no console errors; (2) each migrated control in your list changes the board as named (type a point coordinate and press Enter on curve boards; step a count); (3) one refusal or unavailable reason shows its text once; (4) keyboard: Tab to the control, operate it with keys, visible focus; (5) language switch SL→EN→SL keeps the scene and relabels the control. On two routes per group also check 390×844 with touch emulation: the Edit tab is usable and steppers are at least 44 CSS px.

**Your routes** are in the dispatch message. For each: record passed, failed, blocked or skipped per check with observed evidence; failures with reproduction steps and a screenshot path under `.command-logs/w2-smoke-<group>/`.

**Return** ≤300 words: a table of route × check results, failures first with repro, coverage gaps. Full evidence to `docs/reviews/feature-streams/controls/w2-smoke-<group>.md`.
