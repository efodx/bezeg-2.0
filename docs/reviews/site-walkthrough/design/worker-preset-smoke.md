# Worker note: preset row smoke test

Added test "preset rows can be renamed, overwritten with the current state, and deleted after confirmation" in tests/workflows.smoke.spec.cjs (after the Bezier save test). Covers rename (new id, old id gone, state restored after reload), overwrite (default then preset shows changed x; also after reload), delete (cancel keeps row, confirm removes it, gone after reload).

Commands: `just smoke-built tests/workflows.smoke.spec.cjs --port 4342 --grep "preset rows"` passed 3 of 3; `just lint` passed. Neighbouring save test not re-run.
Observed failures with wrong expectations: old id expected present after rename (count 1, got 0); overwrite expecting 0.65 (got -0.4); cancel expecting row gone (count 0, got 1). Delete-confirm removal not mutated separately.
No product bug found. Not covered: rename validation errors, keyboard flows, Slovenian labels.
