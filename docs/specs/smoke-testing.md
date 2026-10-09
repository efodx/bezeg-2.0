# Bounded smoke testing

Provide a reusable `smoke-tester` skill that dispatches one independent testing agent to exercise representative user workflows after meaningful app changes. Keep Bezeg expectations in [the project checklist](../smoke-tests.md), separate from reusable orchestration.

## Scope and acceptance

- Keep the maintained skill in `tools/skills/smoke-tester/SKILL.md` and install the same content in the personal Codex skills directory for discovery.
- Use one worker, following repository model and reasoning preferences. Give it the checkout, change scope, checklist, target URL or launch instructions, and a default ten-minute budget including setup.
- Exercise the app through available browser tools. Source inspection, successful HTTP responses, and a successful build cannot establish an interaction pass.
- Cover representative graph families, dragging and sliders, navigation, language retention, temporary preset save/reopen, one lesson action, and narrow-screen/keyboard access. Add checks relevant to changed behavior within the budget.
- Report every selected check as passed, failed, blocked, or skipped, with evidence and reproduction steps for failures. Identify tested revision and dirty state; distinguish existing symptoms from demonstrated regressions.
- Preserve existing presets and working-tree changes. Workers report findings without implementing fixes or committing. The handler owns acceptance and any follow-up implementation.
- Invoke after meaningful runtime/UI changes; documentation-only work does not require an app smoke run. Mathematical, type, build, and hosting verification remain change-specific requirements.

## Verification

Validate the skill with the skill-creator validator, inspect document links, and forward-test its decisions with an independent agent using a realistic constrained scenario. A scenario evaluation validates instructions; it does not establish that Bezeg itself passes browser smoke tests.
