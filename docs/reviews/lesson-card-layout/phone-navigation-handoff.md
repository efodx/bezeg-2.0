# Lesson card on phones: Back and Next at the bottom — handoff (2026-11-20)

A side slice of the lesson-card-layout stream, in its own worktree `.claude/worktrees/lesson-card-phone-nav` (branch `worktree-lesson-card-phone-nav`, from `origin/master` ae52664f; `node_modules` is a junction, unlink it with PowerShell before removing the worktree). Handler 4 of the stream works on triage sections 3 and 6 in `.claude/worktrees/lesson-card-layout` and was told to stay off the files below. **Nothing of this slice is pushed.**

## Owner decision

The owner reported that on phones the card "feels weird when it suddenly sticks to the top". Asked for the replacement, he chose: nothing pins to the top; the card scrolls with the page and only the Back/Next row sits at the bottom edge of the screen from the first frame until the card ends. The alternatives he saw were "nothing pinned" and "graph pinned, text scrolls".

## Done (in the commit that carries this note)

- `src/learning/runtime/GuidedLesson.tsx`: `useOneColumn()` (`(max-width: 700px)`); in one column the `nav.guided-lesson-navigation` is rendered as the card's last child, after the text, instead of inside the toolbar, so document order matches the screen. Its height is published as `--guided-lesson-navigation-height`. After Back or Next in one column, when the start of the text is above the window, `alignLessonInWindow()` brings the page back to the graph's top.
- `src/learning/runtime/GuidedLesson.css`: at 700 px and narrower the controls are static and the row is `position: sticky; bottom: 0` with the card's background, a top rule and the safe-area inset; text focused by keyboard stops above it (`scroll-margin-bottom`). `GuidedLessonLayout.css`: the top-pinned controls rule is removed.
- Tests: `tests/lesson-graph-access.smoke.spec.cjs` (a new phone test; the narrow 200 % test now checks Next at the card's top, middle and bottom and Hide at the top), `tests/lesson-experience-checks.cjs` (one-column contract; Hide and Exit checked at the card's top only; the hide and reopen round trip there).

Measured on the build (`node .shots/phone-nav-check.cjs http://127.0.0.1:4441` from the lesson-card-layout worktree; preview `just preview 4441` from this worktree, it dies with the session that started it): Next in the window on the first frame of the Taylor, central limit theorem and degenerate Voronoi lessons at 390×844; keyboard order heading, text, Back/Next with no focused stop under the row (29 stops); no horizontal overflow at 200 % text; Presentation and 667×375 keep the row on the bottom edge; the completion card has no row; 1440×900, 1024×768 and 844×390 are unchanged. Screenshots: `.shots/stick-before-*.png` against `.shots/stick-after-*.png`, `.shots/nav-*.png` in the lesson-card-layout worktree.

## Not done

1. The lesson smoke suites on this build: 347 passed, 1 failed. The failure is `tests/lesson-experience-checks.cjs:27`, "en: toolbar stays put after clipped-pointer Next activation" (log `.smoke-lessons.log`): it presses a partly clipped Next and expects the row not to move, written for the row at the card top. Decide from its body whether the realignment after Back/Next breaks a real promise (then narrow the realignment) or the test needs the new contract. Rerun with `just build`, then `just smoke-built tests/guided-lessons.smoke.spec.cjs tests/lesson-graph-access.smoke.spec.cjs --port 4451`, and repair what fails. Each new or changed assertion needs a failure seen on the old behaviour (serve `origin/master`'s build, or revert the CSS rule).
2. A unit test in `src/learning/runtime/GuidedLesson.test.tsx` with `window.matchMedia` matching: the navigation is the section's last child and the toolbar holds only the progress. Without `matchMedia` (jsdom) the structure is the two-column one, so the existing tests are unaffected.
3. `just check-changed`, then the full `just smoke-built` once (the lesson runtime changed).
4. Documents that still describe the top-pinned controls: acceptance 3 of "Docked beside the graph" in `docs/specs/lesson-panel-visual-refinement.md`; the "Guided lesson reading card" paragraphs of `DESIGN.md` ("stick to the top of the window"); the one-column bullet of `docs/adr/0061-lesson-card-docks-beside-the-graph.md`; check `docs/specs/guided-lessons.md`, `docs/capabilities.md`, `docs/current-architecture.md` and `docs/smoke-tests.md` by search. Say that Hide and Exit stay in the heading at the card's top.
5. Review in the main chat (small diff): the changed focus order, the realignment after Back/Next, `env(safe-area-inset-bottom)`. Read `~/.claude/skills/impeccable/SKILL.md` and `reference/craft-floor.md` before any further UI edit.
6. Evaluation entry, rebase onto `origin/master`, `just publish --background --recipe runtime --base <origin/master> --commits <ids>`, `just publish --status`, `just ci <sha>`. Then tell the owner in plain prose, with the before and after screenshots, and tell `lesson-card-layout handler 4` (SendMessage) that the files are free. Remove this worktree afterwards.

## For the owner

- Hide and Exit are in the card's heading, which now scrolls away with the page; only Back and Next stay in reach. Say so if Hide should stay in reach too.
- On a small landscape phone (667×375) the first screen shows the graph and the row, with the card's title just below the fold.
