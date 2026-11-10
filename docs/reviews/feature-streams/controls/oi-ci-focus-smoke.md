# CI focus smoke fix
- Test: tests/guided-lessons.smoke.spec.cjs "focus follows" (Observation flow).
- Before: failed `overlay keeps focus` (smoke-built, line 2871).
- Edit: added `nextFocused` helper (line 2857); the two post-Next assertions (2872, 2921) now assert the Next button is the activeElement. Open/reopen/Escape assertions unchanged.
- After: smoke-built passed (3.7s). Other specs' section.guided-lesson hits are not focus checks.
- Not run: the rest of the guided-lessons smoke file.
