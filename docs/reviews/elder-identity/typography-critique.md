# Typography critique and polish (2026-11-13)

A design critique of the Literata titles on the botanical studio layout and the changes it led to, across Home, Demonstrations, Learn, one chapter (`learn/bezier-curves`), one workspace (`bezier/curve`), its guided lesson and the picker. Shipped values are in [DESIGN.md](../../../DESIGN.md#typography).

## What hurt the page, worst first

1. **The Home headline was crowded.** A faint outlined elder sprig (18 to 32% opacity) reserved 145 to 250px beside it, so the site's largest words had the narrowest column. Leading of 0.99 with -0.035em tracking packed the lines, and phones had two hand-set sizes.
2. **Titles shared a face but no logic.** The same kind of title used weight 550 on one page and 600 on the next; the wordmark used 650. Tracking ran from -0.035em to none, leading from 0.99 to 1.3.
3. **One title was not in Literata.** The Home section heading was system sans at weight 650, directly under a serif headline.
4. **Ledes were small for their titles.** 17px (15px on phones) under a 60 to 84px headline read as a caption.
5. **The picker heading was a page title.** At 32px it competed with the workspace title behind the dialog.

## What changed and why

- One rule, as tokens in `src/shellTokens.css`: the larger the role, the lighter the weight, the tighter the tracking, the closer the lines. Hero and page titles are 550; smaller titles and the wordmark are 600. Titles with their own size take the rest from their role.
- The hero size is one fluid expression, 42 to 80px, with no phone override, leading 1.05 and tracking -0.022em. Its first stem hangs on the copy's left edge.
- Ledes are 18 to 19px on desktop and 16px on phones, with 1.5 leading. The Home lede is balanced and stays on one line on desktop in both languages.
- The Home section heading is Literata in the section role. The picker heading takes the same role (27px at 1440px).
- Spacing under titles scales with the title. The workspace title has 7px below on desktop to absorb its looser leading; phones keep 9px, so the phone workspace heading and lesson panel keep their former heights.

On a 390px phone the Slovenian headline now sets on three lines, as it did at 320px. It was kept: the break falls at the comma ("Matematika, / ki jo lahko / premakneš."), two lines would run margin to margin and split the clause, and the first preview still starts 487px down an 844px screen.

## The two drawings

- **Home drawing: removed.** A low-opacity outline, in a different style from the filled side botanicals, read as a watermark left behind. Without it the headline has the full column. The header mark carries the elderflower at every width, joined by the side botanicals from 1600px.
- **Picker drawing: removal confirmed.** The dialog is for choosing; its thumbnails are the pictures. The heading reads cleanly alone.

## Recommended, left alone

- Remove the ochre bar above Learn strand headings, since Home and the workspace dropped the same mark: `src/learning/LearningPage.css` (`.learning-strand > h2::before`) and the "Learn landing" section of `DESIGN.md`.
- Decide whether the 48px grid backdrop belongs on Demonstrations, Learn and the picker when Home has none: `src/DemonstrationsPage.css`, `src/learning/LearningPage.css`, `src/DemonstrationPicker.css`.
- Balanced Slovenian titles can end a line on a one-letter preposition ("krivulje s / kontrolnimi"); a no-break space fixes it, a copy change: `src/learning/content/bezierChapter.ts` and its siblings.
- `DESIGN.md` still gives the lesson frame heading as 20px (it ships at 22px) and names sans and Georgia headings in its Learn and chapter sections. `docs/specs/elder-identity.md` and `docs/specs/side-botanicals.md` still mention the removed `welcome-botanical` drawing.

## Not judged

- Chromium only. A browser without `text-wrap: balance` breaks the headline greedily.
- No real phones: browser chrome height and pixel density were not seen.
- Only six widths (320, 390, 724, 1024, 1366, 1440px); nothing at 1600px or wider with the side botanicals.
- One chapter, one workspace and one lesson; longer titles elsewhere were not seen.
- English was looked at on Home only; elsewhere it was measured.
- The font swap from Georgia to Literata on a cold load, and presentation mode.
