# Lesson panel CI regression repair

## Scope — 2026-10-25

Repair Browser smoke run 40195511721 following the visual refinement in `lesson-panel-visual-refinement.md`. Preserve the approved panel appearance and existing runtime behavior. CI reports fourteen stale background-color assertions and one scroll-preservation setup failure.

## Acceptance

- Reproduce the failures against the current production build before modifying checks.
- Check the opaque reading surface against its approved shell panel role rather than the superseded literal color; continue detecting transparent/incorrect surfaces.
- Exercise a real, nonzero reading scroll offset before hide/reopen on a production lesson frame, and retain the delayed mathematics reflow, same-frame and scroll-restoration assertions. Select test conditions that actually need scrolling under the approved layout; do not fabricate prose, skip checks, lower the assertion to zero or change runtime behavior to satisfy a fixture.
- Keep all responsive, pointer-reachability, keyboard, exit and scene checks intact. Address any newly exposed real failure rather than weakening coverage.
- Run all Lesson reading experience checks and relevant lesson smoke checks. Push the verified repair to master, then confirm the replacement hosted Browser smoke/deployment result.

## Constraints

Use a clean integration worktree; preserve unrelated local changes. No mathematical, route, preset, localization or lesson-copy changes are intended. Test-only repairs do not require an additional delegated UI smoke pass; the affected Playwright suite supplies browser verification.
