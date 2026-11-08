# Brief: shared graph controls, task 1 slice 5a, lint rule (handoff-v13)

**Role.** `bezeg-worker`, implementation and tests. Edit only the owned paths; do not commit, push or delegate. Preserve unrelated working-tree changes. Another worker (5b) runs in parallel and owns `src/inputs/**` test helpers and graph test files; do not touch them.

**Goal.** The lint half of [task 1 slice 5](../../../tasks/shared-graph-controls/01-foundation.md): spec acceptance 2 with the full exemption list, and acceptance 7. Read in the [spec](../../../specs/shared-graph-controls.md): Rule, Likely exceptions, Acceptance; in [lesson-authoring workstream 1](../../../specs/lesson-authoring-architecture.md#1-shared-inspector-controls) the lint paragraph (search "narrow lint restriction") and I5.

## Settled decisions

- **L-a Rule.** In `eslint.config.mjs`, a `no-restricted-syntax` block for `src/graphs/**/*.tsx` and `src/learning/**/*.tsx`, excluding `**/*.test.tsx`, that reports JSX `input`, `select` and `textarea`, and react-bootstrap `Form.Control`, `Form.Range`, `Form.Select`, `Form.Check` (and the same as named imports `FormControl`, `FormRange`, `FormSelect`, `FormCheck`, if used anywhere). Message: use the shared controls in `src/inputs/` (`NumberInput`, `Slider`, `CountSetter`, `OnOffSwitch`, `ChoiceSelect`) or add a reasoned exemption. A **stepper** is a raw `type="number"` input (caught as `input`); a hand-built −/+ button pair has no reliable syntactic signal: grep for such pairs, list any you find in the exemption list under their reason, and state in the evidence that new hand-built steppers are not caught.
- **L-b Exemption list.** One named array in `eslint.config.mjs`, `controlExemptions`, of `{files, reason}` entries, mapped to config blocks that turn the rule off for those files. Every current bypass is listed (grep found 21 non-test files; verify). Reasons: a spec "Likely exceptions" row name where one applies (KnotEditor, Drawing playground toolbar, …), `"host chrome, not a graph control"` for Preset/import dialogs if they are hosting UI, otherwise `"unmigrated: <family> sweep (task 3)"` with the family (compgeo, projective, functions, curves, patches, learning). No `eslint-disable` comments and no `eslint-suppressions.json` entries for this rule.
- **L-c Family template.** In `docs/tasks/feature-streams/README.md#family-template`, add to the F2a Graph row: graph controls use the shared controls; a raw control fails lint; an exception needs a reason in `controlExemptions` and a row in the spec's Likely exceptions.

## Owned paths

`eslint.config.mjs`, `docs/tasks/feature-streams/README.md` (the F2a row only), the evidence file.

## Acceptance and checks

1. `just lint` passes on the tree as is.
2. Observed failures, logs `.command-logs/5a-mut-*.log`: a raw `<input>` added to a non-exempt graph file fails lint with the message; the same in an exempt file passes; a `Form.Range` in a non-exempt file fails; removing one exemption entry makes its file fail. Restore every mutation.
3. `just tooling-test` if `eslint.config.mjs` is covered by it (check `just --list`).

## Return

≤200 words: rule shape, exemption count by reason, steppers found, mutation summary, checks with log names. Evidence in `docs/reviews/feature-streams/controls/foundation-5a.md`.
