# 04 Tools and lesson cards

Source: [board workspace spec](../../specs/ux-picks-app-wide.md); [ADR 0063](../../adr/0063-cards-on-the-board.md), which supersedes ADR 0061. Reference: `src/uxPicks/toolsCard/`, `src/uxPicks/dock/useLessonDock.ts`, `src/uxPicks/dockTools/`, `src/inputs/ToolSection.tsx` at the frozen commit.

## Goal

The tools column is gone. Orodja and the Guided lesson are board cards on the shell from task 03, and the graph has the full width.

## Slices

1. **Orodja card:** Uredi, Prikaz and Shrani as icons in its head; declared `ToolSection`s with fold and "?" help; "Več"/"Manj" taking and returning the column; a section whose controls all became pucks shows no empty heading.
2. **Lesson card:** on the board, placed and folded like other cards and stored globally; `GuidedLesson` is never remounted by a move; text ends on whole lines; the Povrni pill and the "Več" bar are part of the layout function's input, so neither covers text nor changes the card's height when it appears (unsolved on the prototype).
3. **Reading frames do not lock controls**; "Povrni" appears when the graph differs from the frame; one rule on every screen size.
4. **Card budget on first view:** two open cards from 1200 px (lesson, then Odčitki, then Orodja; a graph whose main action is in the tools opens Orodja first), one below; Legenda and section cards start folded.
5. **Header and surroundings:** slim one-row header from 701 px; lesson counter "Korak 1/8 · del 5/5"; activity strip hidden during lessons; gestures hint on the toolbar line.
6. **Documents:** mark ADR 0061 superseded; update DESIGN.md (no fixed 310 px inspector column) and the lesson layout spec that describes the docked card.

## Acceptance

- At 1440×900 and 1024×768 the board, pucks strip area and lesson navigation fit the screen on the pilots, free and in a lesson.
- Opening Orodja from its folded chip reaches its resting height in one glide (frame sampling).
- A lesson walk on each pilot: no remount of the lesson, the frame's task text is never hidden behind "Več" with free board below, the folded Orodja chip does not move between frames.
- Presentation mode and chapter activity pages work with the card layout.
- Keyboard and touch pointer moves of both cards; reduced motion.
- Critique: at most two rounds; P1s fixed, P2s fixed or logged here.

## Not in this task

The phone layout (task 09). Phone checks this task breaks are skipped and listed there.
