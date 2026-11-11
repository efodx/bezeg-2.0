# ChoiceSelect ResizeObserver tests

Added in src/inputs/ChoiceSelect.test.tsx, describe "with a ResizeObserver" (stubbed class capturing the callback, disconnect spy):
1. shrink then grow, firing the callback: full-text line appears, then disappears.
2. a re-render with the same value and option texts (new array, added help) does not measure again.
3. observer disconnected exactly once on unmount, not before.

Measurement is counted at the select's clientWidth read, because the canvas context is cached module-wide (an earlier test's context would hide a per-test measureText counter).

Deliberate breaks (production restored after each):
- observer callback replaced by a no-op: test 1 fails.
- layout effect without dependencies: test 2 fails.
- cleanup without disconnect: test 3 fails.

Checks: just unit (7 passed), just lint src/inputs passed, tsc clean. No production change.
