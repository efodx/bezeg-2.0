# Brief: task 04 slice 6, header and surroundings

Handoff-v13. Role: `bezeg-worker`, Sonnet medium, edits allowed in owned paths. Worktree `C:/Users/1337Hacker/Desktop/bezeg-2.0/.claude/worktrees/board-workspace`; cwd, no `cd`, Write not heredocs, do not commit. Send independent reads in one message. ESLint must report no errors on every file you change. Handoff note: `docs/reviews/ux-picks-app-wide/briefs/notes/04-slice6.md`.

## Goal

Task 04 slice 6 and its acceptance ([task](../../../tasks/ux-picks-app-wide/04-tools-and-lesson-cards.md)): at 1440×900 and 1024×768 the board, the pucks strip area and lesson navigation fit the screen on the pilots, free and in a lesson; in Presentation at 1440×900 the plot and the strip fit together during a lesson.

## Items

1. **Board stage fills the space:** replace the stopgap clamp in `src/graphs/base/DemonstrationWorkspaceIdentity.css` (`clamp(400px, 100svh - 360px, 720px)`, commit `e705f727`) with a layout that gives the board stage exactly the viewport height left under the header (flex/grid fill, `min-height: 0`), at least 400 px. Measure the stage before/after at 1440×900 and 1024×768 on Taylor free and in its lesson (`?learn=1`).
2. **Slim header from 701 px:** one row (breadcrumb, title, actions) instead of the stacked heading and description; the description moves behind a disclosure or into the title's tooltip/aria-describedby (keep it reachable). Presentation's title and header leave room for the plot (the independent review found the plot pushed below the fold).
3. **Lesson counter** reads "Korak 1/8 · del 5/5" (find the current counter string "Korak 1 od 8 · Okvir 1 od 5" in the catalog/fragments; change the Slovenian and English strings together; English "Step 1/8 · part 5/5"). Check `docs/localization.md#choosing-new-terms` for "del" vs "okvir" and record the choice in your return.
4. **Activity strip hidden during lessons** (the chapter activity context row/strip in the header while a lesson is active).
5. **Gestures hint** (pan/zoom hint) on the toolbar line, not as its own row.

## Owned paths

`src/graphs/base/DemonstrationWorkspace.tsx` (header region and layout only), `DemonstrationWorkspace.css`, `DemonstrationWorkspaceIdentity.css`, header-related components it renders, the lesson counter's catalog strings (fragment or `sl.ts`/`en.ts` where they live today, in lockstep), their tests. Not `src/workspace/**` (another worker is wiring pucks there), not `GuidedLesson.tsx` beyond the counter string, not `tests/**`.

## Checks

Unit tests where behaviour changes (counter text, strip hidden in lessons), observed failing once. `just unit src/graphs/base src/learning/runtime src/localization` (foreground, timeout 600000), `npx tsc --noEmit --pretty false`, eslint, `just build`. Browser on the dev server `http://127.0.0.1:4483/bezeg-2.0/` (running; do not start/stop; clear localStorage `bezeg-2.0:board-layout`): Taylor, linear map, De Casteljau free and in lesson, at 1440×900 and 1024×768, plus Presentation at 1440×900 in the Taylor lesson: report header height, stage rect, whether all cards and the lesson navigation are inside the viewport, page errors.

## Return (≤300 words)

Per item the change (`file:line`), tests, browser numbers, the term choice.
