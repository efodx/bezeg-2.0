# Workflow evaluation harness

Replays past Bezeg tasks under the current agent workflow, so model, effort, staffing or brief changes can be compared on the same work. Contract: [agent workflow evaluation](../../docs/specs/agent-workflow-evaluation.md#repeatable-evaluation-harness--2026-10-24).

## Tasks

| Size | Task | Replays | Hidden contract tests |
| --- | --- | --- | --- |
| S | `count-setter` | `4a6c092`, count values hidden beneath stepper buttons | `tests/count-setter.smoke.spec.cjs` |
| **M (default)** | `chapter-activity-controls` | `aaa5c65`, chapter activity focus and reading control access | `tests/standalone-learning.smoke.spec.cjs` |
| L | `fixed-point-lesson` | `3d37627`, fixed-point graph, demonstration and guided lesson (Parts B and C) | route, demonstration catalog, lesson catalog and lesson notation unit tests |

[`tasks.json`](tasks.json) pins each task's base and solution commit, its prompt, the spec files taken from the solution, and every held-back test with its tier.

## Run

```powershell
just eval list
just eval setup            # medium; or: just eval setup S | L | <task id>
```

Setup prints the sandbox and prompt paths. Open a fresh Claude or Codex session in the sandbox `repo` folder, paste `prompt.md`, and let the handler work as usual. When it reports completion:

```powershell
just eval grade <run directory>
```

Runs go to `%USERPROFILE%\agent-eval-runs` (override with `--root` or `AGENT_EVAL_ROOT`). Keep the path free of `bezeg`, so `claude_turn_usage.py` does not mix sandbox sessions into ordinary usage. Run directories are named `<task>-<UTC timestamp>`. Delete one with its folder once its grade report is recorded.

## Sandbox layers

Each setup composes a new history-free repository; no branch or tag is kept in this repository.

1. **App**: every file of the task's `base` commit.
2. **Task**: the `spec` files from the `solution` commit (the task file already exists at the base for `fixed-point-lesson`).
3. **Tooling**: the `tooling` paths from `HEAD`, replacing the base versions wholesale: `AGENTS.md`, the justfile and command runner, Playwright config, agent workflow, command and smoke guides, skills, usage tools, Codex config and `.gitignore`. `--workflow <ref>` takes them from another revision; `--workflow <directory>` copies them from a working tree to trial an uncommitted variant.

The sandbox has two commits, `eval base` and `eval tooling`, tagged `eval-start`, and no remote. `npm ci` runs during setup unless `--no-install`. The evaluation log and research stay out of the sandbox because they describe how the original tasks were solved.

## Grading

`grade` measures the sandbox's working tree, including uncommitted work, with the sandbox's own `just` runner:

- **Gates**: `typecheck`, the full `unit` suite (including the agent's tests) and `build`.
- **Hidden contract tests**: written in place temporarily, then restored. They use only names and behavior the spec fixes, so any compliant solution should pass.
- **Hidden reference tests**: tests of the original design (internal module names, exact lesson steps). Informational only; a failure is not a defect.
- **Git and usage**: commits since `eval-start`, uncommitted paths, diff size; Claude usage from the project folders of the sandbox and its worktrees, Codex usage from rollouts whose working directory is inside the sandbox, each split into handler and workers, with the first-to-last activity span.

The verdict is `accepted` when gates and contract tests pass, `incomplete` when gates pass but `--skip-smoke` left a contract smoke test unrun, otherwise `rejected`. The JSON report is written to `grade-<timestamp>.json` in the run directory. It replaces neither handler review against the spec's acceptance criteria nor the evaluation record.

## Calibrate

```powershell
just eval calibrate        # medium; S, L or a task id for the others
```

Grades the solution commit and the untouched base under current tooling. Calibration passes when the reference passes every gate and hidden test and the base fails at least one contract test. Rerun it after tooling changes, before relying on a comparison; when the current tooling no longer runs on a base, move the task to a newer replay rather than patching the base.

## Limits

- One run per configuration is anecdotal; compare at least three runs per arm for the same task.
- The sandbox does not hide this repository; the prompt asks the agent not to read other checkouts. Treat a run that did as invalid.
- Usage reflects transcripts available locally at grade time. Sessions started outside the sandbox are not counted.
- `node --test tools/agent-eval/agent_eval.test.cjs` covers manifest validation, usage parsing and verdicts.
