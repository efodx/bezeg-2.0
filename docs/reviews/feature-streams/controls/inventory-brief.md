# Inventory brief (handoff-v13), shared by parts 1–4

**Role.** Research. Do not edit application code, specs or task files. Write only your own part file.

**Goal.** Complete your share of [task 0](../../../tasks/shared-graph-controls/00-inventory.md) against the [spec](../../../specs/shared-graph-controls.md). Read the spec's *Capability catalogue*, *Likely exceptions* and *Owner decisions*. The handler merges the parts into `inventory.md` and decides exceptions; you only propose them.

**Scope.** Your dispatch names your directories and open items. Other parts run in the same worktree: leave their files alone, and commit nothing. Build and preview belong to the handler.

**Entry.** `docs/reviews/feature-streams/controls/inventory-signals.tsv` lists every `.tsx` under `src/graphs` and `src/learning/playground` with control signals: lines, path and match counts. It comes from text search, so use it to locate code, not as a finding. The audit reports in `docs/reviews/shared-graph-controls/` contain false and imprecise rows; check each claim you reuse against source, and prefer the spec where they differ. Line numbers there date from `2f548f65`.

**Output.** `docs/reviews/feature-streams/controls/inventory-part-<n>.md`, with these sections:

1. `## Panels`: a table with one row per panel (a component that renders controls to the user), columns `Panel | Path | Shared | Local | Exception candidate`. List capability numbers in each cell, for example `C5, C11`. A capability missing from all three means the panel does not offer it. Under `Local`, name the local version briefly, for example `C5 hand stepper`. Files that are only helpers go in one line under the table.
2. `## Open items`: each assigned item with an answer and `file:line` evidence, or a named reason it could not be answered. Say whether the answer was read from code or observed running.
3. `## Exception candidates`: each with its technical or mathematical reason and the shared control it would otherwise use. Cover any *Likely exceptions* entry in your directories.
4. `## Local Reset`: each local Reset button in your directories, what it restores, and whether the host Reset gives the same result, with evidence from both code paths.
5. `## Spec differences`: anything in the spec's rows that source contradicts.

**Checks.** Every panel in your directories has a row: compare your table with the TSV before returning. A claim about behaviour needs a `file:line` you read yourself. Mark anything inferred as inferred. No tests are needed.

**Return.** At most 200 words: part file path, row count, items unanswered, and any contradiction in the spec or instructions, with `file:line`.

**Budget.** Every turn re-reads your history. Locate with `grep -l` or `-c` before `grep -n`, batch searches into one command, read the control JSX and handlers rather than whole files, at most about 150 lines per call, and never a whole file over about 300 lines. Write to your part file as you finish each directory, so partial work survives. On `HANDOFF`, stop at a consistent point, add a `## Handoff` section naming the panels and items left, and return as partial.
