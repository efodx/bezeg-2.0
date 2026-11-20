# Lesson card on phones: Back and Next at the bottom — state (2026-11-20)

A side slice of the lesson-card-layout stream, built in its own worktree `.claude/worktrees/lesson-card-phone-nav` (branch `worktree-lesson-card-phone-nav`; `node_modules` is a junction, unlink it with PowerShell before removing the worktree). Two handler sessions; this note is the state when the second one published.

## Owner decision

The owner reported that on phones the card "feels weird when it suddenly sticks to the top". Asked for the replacement, he chose: nothing pins to the top; the card scrolls with the page and only the Back/Next row sits at the bottom edge of the screen from the first frame until the card ends. The alternatives he saw were "nothing pinned" and "graph pinned, text scrolls".

## Done

- `src/learning/runtime/GuidedLesson.tsx`: `useOneColumn()` (`(max-width: 700px)`); in one column the `nav.guided-lesson-navigation` is rendered as the card's last child, after the text, instead of inside the toolbar, so document order matches the screen. Its height is published as `--guided-lesson-navigation-height`. After Back or Next in one column, when the start of the text is above the window, `alignLessonInWindow()` brings the page back to the graph's top.
- `src/learning/runtime/GuidedLesson.css`: at 700 px and narrower the controls are static and the row is `position: sticky; bottom: 0` with the card's background, a top rule and the safe-area inset; text focused by keyboard stops above it (`scroll-margin-bottom`). `GuidedLessonLayout.css`: the top-pinned controls rule is removed.
- Tests: `tests/lesson-graph-access.smoke.spec.cjs` (a phone test; the narrow 200 % test checks Next at the card's top, middle and bottom and Hide at the top), `tests/lesson-experience-checks.cjs` (one-column contract; Hide and Exit at the card's top only; two pointer presses on Next at one point move neither the row nor the page), `src/learning/runtime/GuidedLesson.test.tsx` (the one-column structure, the return to the graph, the width change, the removed listener).
- Documents: ADR 0061 (decision and the pinned heading as a tried alternative), acceptance 3 of "Docked beside the graph" in `docs/specs/lesson-panel-visual-refinement.md`, `DESIGN.md`, `docs/specs/guided-lessons.md`, `docs/current-architecture.md`.

## Checked

- Failures seen first: the 12 changed smoke tests and the unit test fail on master's build and source; with only the realignment disabled, the unit test and the phone test of `lesson-graph-access` fail.
- `just check-changed` (it falls back to Vitest's `--changed`, about 25 minutes, because the shared stylesheet changed) and the full `just smoke-built` (589 passed) before the rebase; the two lesson suites again on the build of the rebased tree.
- Review in the main chat: focus order is heading, text, Back/Next and Next keeps focus after a press; `env(safe-area-inset-bottom)` is zero today because the viewport meta has no `viewport-fit=cover`, so the padding is 8 px everywhere.
- Screenshots at 390×844, outside the repository: `C:\Users\1337Hacker\Desktop\bezeg-phone-nav-shots` (`before-*`, `after-*`, and `capture.cjs`, which made the after set from a preview).

## Left

After the push: `just publish --status`, `just ci <sha>`, tell the lesson-card-layout handler that the lesson card files are free, remove this worktree (junction first).

## For the owner

- Hide and Exit are in the card's heading, which now scrolls away with the page; only Back and Next stay in reach. Say so if Hide should stay in reach too.
- On a small landscape phone (667×375) the first screen shows the graph and the row, with the card's title just below the fold.
- A frame whose card ends inside the window has the row at the card's end, not on the window's edge. On the first screen as loaded this does not happen at 390×844. Read from the graph's top edge, 10 of the 22 Taylor frames are that short and the row sits 96 to 139 px above the edge there, so Next moves up and down between frames (`after-3-*` against `after-4-*`). A tap that misses lands on the locked tools and does nothing. Two repairs are possible and both change what you chose or what `DESIGN.md` says: let the card fill the rest of the screen under the graph (blank space in short cards, against "natural content height"), or move the page after such a press so the row stays on the edge (the graph shifts down). Left as built until you choose.
- The scheduled run of 2026-11-20 (44729645497) failed in `lessons-2` on three parameterization lessons. It belongs to the graph-control stream, which repaired it in `53441b5f`; the pushes to master since are green.
