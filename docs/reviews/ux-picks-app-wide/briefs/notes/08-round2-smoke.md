Round 2 smoke: all 5 failures were one cause. Card-head buttons (Hide / compact reopen tab, `.board-card-button`) are 28 px with a fine pointer and 44 px on `pointer: coarse` (CardShell.css:77-81, task 11). Tests demanded 44 always. Test drift, not an app defect.
Fix: tests/guided-lessons.smoke.spec.cjs (compact tab, ~3181) and tests/lesson-experience-checks.cjs (~336, Hide only) expect 28 on fine pointer, 44 on coarse; Exit and Next keep 44.
After: `just smoke-built tests/guided-lessons.smoke.spec.cjs --port 4391` passed (381 s), log 08-round2-smoke-a.log.
