# Evidence: task 1 slice 5a, control lint rule

Rule: `eslint.config.mjs` block `no-restricted-syntax` on `src/graphs/**/*.tsx` and `src/learning/**/*.tsx` (not `*.test.tsx`), three selectors: JSX `input`/`select`/`textarea`; `Form.Control|Range|Select|Check`; named `FormControl|FormRange|FormSelect|FormCheck`. `controlExemptions` (`{files, reason}`) maps to blocks turning the rule off.

Exemptions: 21 caught files plus 5 hand-built stepper files (26). Host chrome 2 (PresetImportDialog, PresetSelector); unmigrated curves 2 (AxisSelector, PointCoordinateEditor); compgeo 10; patches 1; projective 4; learning 2 (CollisionPlayground radios, LookUnderneath switches). No spec "Likely exceptions" row applied to a currently caught file.

Hand-built steppers found (grep for -/+ buttons; NOT caught, listed as exemptions for the sweep): FourierSeriesGraph, RungeInterpolationGraph, TaylorGraph, UniformConvergenceGraph (functions), RationalBezierCurveControls (curves). New hand-built steppers are not caught by the rule; raw `type="number"` steppers are (as `input`).

No `eslint-disable` or suppressions entries added.

Checks
- `just lint` on the tree: passed (`.command-logs/5a-lint.log`).
- Mutations (all restored; `git status` shows only intended files):
  - raw `<input>` in new non-exempt `src/graphs/base/ZzMut.tsx`: exit 1 with the message (`5a-mut-nonexempt-input.log`).
  - `Form.Range` in same file: exit 1 (`5a-mut-nonexempt-range.log`).
  - raw `<input>` appended to exempt PresetImportDialog: exit 0 (`5a-mut-exempt-input.log`).
  - exemption entry for PresetImportDialog removed: its existing `Form.Control` fails (`5a-mut-removed-entry.log`).
- `just tooling-test`: not run; `scripts/commands.test.cjs` only mocks eslint and does not read `eslint.config.mjs`.
