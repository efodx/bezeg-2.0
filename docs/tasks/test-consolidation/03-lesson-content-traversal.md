# 3. Traverse authored lesson content once

Status: in progress; merged traversal measured slower than two walks, direction open (coverage.md "Task 3 single content traversal"). Depends on task 2. Source: [specification](../../specs/test-consolidation.md), acceptance 1, 4 and 7–9.

## Scope and entry points

Own the data-driven content walk in `tests/guided-lessons.smoke.spec.cjs` and focused content/real-graph checks under `src/learning/content/`. Use the production lesson rendering and actual route; do not add test routes to the app or a separate fixture build as the default solution.

Today every lesson completes a Slovenian desktop walk and an English 390px walk. Keep every lesson represented, but avoid navigating its entire frame sequence twice. Task 2 supplies representative shared interaction/desktop flows.

## Implementation and acceptance

- Build one exhaustive browser content traversal per lesson. Use the existing narrow walk as the starting candidate; preserve actual MathJax rendering, formula containment, page overflow and pointer-reachable actions. Cover both localized content versions at each applicable frame without restarting the lesson, checking that language changes retain frame and graph state.
- Keep the desktop/projection/short-screen/320px/enlarged-text matrix on representative structural cases. Retain any per-content desktop check that discovers an independent failure; do not assume narrow success proves every desktop layout.
- Preserve the newer upstream every-frame visible-point framing assertions at both desktop and narrow widths, including intentional `offscreenSteps` exceptions. At each frame, resize the same live page, wait for real board/MathJax layout to settle, and observe both widths before advancing. Assert resizing does not change frame or mathematical state. This retains content-specific framing coverage without a second navigation sequence; measure resize overhead before claiming a gain.
- Preserve independent expected mathematical/readout/point assertions in each row. A scene being accepted or an expected value copied directly from the action under test is not mathematical verification. Reuse existing lower-level math checks where they cover the same behavior, with a mapping.
- Run scene-specific numeric probes once per applied scene where repeating them on unchanged explanatory frames adds no coverage. Retain tests of idempotent reapplication/navigation when that is the behavior being verified.
- Assert every required frame is reached in order and completion occurs, with an explicit failure when the traversal guard expires. Reuse the upstream `src/learning/runtime/lessonSmokeCoverage.test.ts` for catalog-to-row completeness and update it only as needed for the final organization. Do not rely only on a minimum count or unique step numbers.
- Demonstrate temporary broken content mathematics/reachability and formula overflow still fail the relevant checks, then revert faults.

## Verification and handoff

Run focused content tests including `lessonMathNotation.test.ts`, typecheck, build and delegated browser coverage of all lesson rows plus the representative desktop matrix. Compare full-frame traversals, asserted content/languages, full wall time and summed test time against baseline. Revisit the approach if language switching costs erase the traversal savings; preserve exhaustive bilingual content checks regardless of final organization. Update smoke guidance after acceptance.
