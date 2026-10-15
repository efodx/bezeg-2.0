# Improve delegation measurement

**Status:** complete
**Source spec:** [Agent workflow evaluation](../../specs/agent-workflow-evaluation.md)

Improve task handoffs and future evidence collection without changing the current model assignments. Use the first evaluation cycle to establish comparable records before promoting an alternative model or effort setting.

## Acceptance criteria

- The workflow defines a concise assignment brief and role-specific return evidence.
- The log has a forward-looking record format that captures dispatch rationale, handler and worker settings, assignment completeness, parallelism, elapsed boundary, rework, findings, verification, and available usage.
- The evaluation skill explains how to record unknowns and compare task classes without implying causation.
- The research note records current official Codex and Claude subagent guidance and labels it as guidance rather than repository performance evidence.
- Existing model defaults, existing log entries, and unrelated working-tree changes are preserved.

## Implementation slices

1. Add assignment and pilot guidance to `docs/agent-workflow.md`.
2. Add the new record schema and comparison rules to the evaluation log and skill.
3. Record current official platform guidance and the limits of the initial Bezeg sample in `docs/agent-delegation-research.md`.
4. Review only the workflow documentation diff and leave application code and unrelated edits untouched.
