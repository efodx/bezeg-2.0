# Wave 2 smoke brief (compgeo and projective sweeps)

**Role:** `bezeg-smoke`, browser checks only. Do not edit app code; write only your evidence file and scripts under `.command-logs/`. Read `.agents/skills/smoke-tester/SKILL.md` and `docs/smoke-tests.md` (Setup, Evidence and limits).

**Preview:** production build of commit `4361fd7f`, served by the handler from the clean worktree with `just preview 4327` at `http://localhost:4327/bezeg-2.0/`. Do not start or stop it. Resolve routes from `src/demonstrations.ts` (catalog ids) and lessons from `src/learning/runtime/lessonCatalog.ts`. Chromium via the repository's Playwright install; desktop 1280×800 unless a check says 390×844 with touch emulation.

**What changed:** the panels moved to shared controls (spec `docs/specs/shared-graph-controls.md`, decisions 32–40). Expected: example and mode rows are selects (`ChoiceSelect`) with a "custom" entry only while the scene matches no example; number fields commit on Enter or blur and refuse out-of-range input with a stated range; angle fields wrap (370 → 10); Show all and Reset view are gone (the host Fit frames the scene); trace readouts are announced through one hidden polite region and the visible step text counts from 1.

**Per route, five checks:** (1) loads with board and inspector, no console errors; (2) each migrated control in your list changes the board as named; (3) one refusal or unavailable reason shows its text once; (4) keyboard: Tab to the control, operate it with keys, visible focus; (5) language switch SL→EN→SL keeps the scene and relabels the control.

**Your routes** are in the dispatch message. For each: record passed, failed, blocked or skipped per check with observed evidence; failures with reproduction steps and a screenshot path under `.command-logs/w2-smoke-<group>/`.

**Return** ≤300 words: a table of route × check results, failures first with repro, coverage gaps. Full evidence to `docs/reviews/feature-streams/controls/w2-smoke-<group>.md`.
