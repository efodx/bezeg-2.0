# Site walkthrough: shell and label polish

Status: scheduled 2026-11-14 by the owner; run by the `polish` session listed in the intake. Package B of the [site walkthrough intake](site-walkthrough-intake-2026-11-14.md#11-disposition-2026-11-14). Not started; no task files yet.

Source: intake items D01, D02, L02, L03, H01, H05, M01, M02 and M03. These are the items that need no owner decision before work starts. The file references below were located by search on `master` at `f1d33fa4`; no browser investigation was done, so each slice starts by reproducing its item in a screenshot.

## Scope

Four slices. They touch disjoint files and can run in any order or in parallel.

| Slice | Intake IDs | Area |
| --- | --- | --- |
| 1 | D01, D02 | Demonstrations catalog cards and topic list |
| 2 | L02, L03 | Chapter previous / next navigation and the return control |
| 3 | H01, H05 | Homepage footer and the header brand |
| 4 | M01, M02, M03 | Graph point labels and movable-point affordance |

Out of scope: every intake item in packages C and D (homepage featured content, carousel navigation, chapter numbering, guided Back button, side botanicals on chapters, presets, graph typography and captures). Elder artwork stays postponed as recorded in [elder identity](elder-identity.md). No route or stored-preset change.

## 1. Catalog cards (D01, D02)

Evidence: `src/DemonstrationCollection.css` (`.demonstrations-catalog-card`, `.demonstrations-catalog-preview-frame`, `.demonstration-preview-stage`, `.demonstration-topics button`, `.demonstrations-catalog-title`, `.demonstrations-catalog-action`) and `src/DemonstrationPreview.css` (`.demonstration-preview-media`).

- **D01.** The capture frame takes its corner radius from the card, so a poster or clip never shows a square corner inside a rounded card. Apply it where the preview component is used, including the homepage carousel cards if they show the same junction.
- **D02.** Review the topic names in the left list, the titles on cards, and the Open / Guided example actions against the page headings the owner likes. The actions were settled as minimal ghost buttons in [demonstration action affordances](demonstration-action-affordances.md); refine within that treatment, or record the reason there if it changes.

Acceptance:

- **C1:** At 1440, 1024 and 390 px, in both languages, no capture corner is visible against its card, at rest, on hover and while a clip plays.
- **C2:** Topic names, card titles and card actions use the shell's type tokens (`src/shellTokens.css`); no new one-off font size or weight. Before and after screenshots are kept in the completion evidence.
- **C3:** Card height, action hit areas (44 px minimum) and the sticky topic list keep their current behavior. Long Slovenian titles still wrap without overflow.

## 2. Chapter navigation (L02, L03)

Evidence: `src/learning/ChapterNavigation.tsx` (the `learning-back` link and the previous / next links). Earlier decisions: [chapter return control](chapter-return-control.md), [chapter reader polish](chapter-reader-polish.md).

Keep the position of the previous / next controls and the chapter-title typography. Change only the "Previous chapter" / "Next chapter" wording line and the arrows, and the arrow and overall treatment of the All learning content control. One arrow drawing serves all three.

Acceptance:

- **N1:** Previous, next and return controls use the same arrow glyph or SVG at one optical size, aligned to the text baseline or cap height.
- **N2:** Placement and the chapter-title treatment are unchanged; first and last chapters still show one control without a gap.
- **N3:** Keyboard focus order, focus rings and accessible names are unchanged. Checked at 1440 and 390 px in both languages.

## 3. Homepage footer and header brand (H01, H05)

Evidence: `src/WelcomePage.tsx` lines 24–26 and `.welcome-page footer` in `src/WelcomePage.css`; `src/AppHeader.tsx` lines 14–15 (a 34 px `elderflower.svg` beside the wordmark).

- **H01.** Remove the footer element, its styles and its localization keys from `sl.ts` and `en.ts` where nothing else uses them. User impact, to record at closeout: the homepage no longer shows the project description, the author and supervisor credit or the contact line for suggestions and bug reports. The owner confirmed on 2026-11-14 that all three go; contact details return when he is ready to share the site.
- **H05.** Review the icon's size, spacing and alignment beside the wordmark. The icon file itself is not replaced; the tab and phone icons are not touched. The phone header must stay on one row at 390 and 360 px, as [botanical studio refinement](botanical-studio-refinement.md) measured.

Acceptance:

- **F1:** The homepage renders no footer and leaves no empty band at the bottom at 1440 and 390 px. `npx tsc --noEmit --pretty false` and the production build pass after the key removal.
- **F2:** The header brand is shown in before and after screenshots at 1440, 820 and 390 px. The header's height and the one-row phone layout are unchanged.

## 4. Point labels and movable points (M01, M02, M03)

Evidence:

- `src/graphs/base/bindMovablePointCursor.ts` is the shared hover binding from [movable-point cursor](movable-point-cursor.md). It is used by the Bézier curve base (`src/graphs/curves/object/AbstractJXGPointControlledCurve.ts`), `src/graphs/base/points/pointFactory.ts` and the function graphs. `src/graphs/compgeo/IntervalSweepGraph.tsx` does not reference it.
- About a dozen other graphs set a cursor themselves (for example `IsometryGraph`, `UnitCircleGraph`, `LineGeometryGraph`).
- The owner saw labels that look unlike MathJax text in blossoming / polar form (`src/graphs/curves/bspline/BSplineBlossomGraph.tsx`) and in Interval Sweep.

Order of work:

1. **Inventory (M03).** One table over every registered graph: how each draggable point is created, whether it gets the hover cursor and from where, and how its label is rendered. Write it to `docs/reviews/site-walkthrough/point-inventory.md`. This step changes no code.
2. **Fix the two reported graphs (M01, M02)** through the shared paths the inventory finds.
3. **Decide the consolidation from the inventory.** If most graphs can create points through one path that owns both the cursor binding and the label rendering, migrate the rest in file-disjoint batches. If the divergence is deliberate somewhere, record why and leave it.

Acceptance:

- **P1:** In Interval Sweep, hovering a draggable point shows the same cursor as a Bézier control point and restores it on exit. Fixed points do not advertise dragging.
- **P2:** Point labels in blossoming / polar form and Interval Sweep render through the same math path as other graph labels. A rendered-output assertion or a screenshot comparison shows it.
- **P3:** The inventory lists every registered graph, and each row that differs from the shared path is either migrated or has a recorded reason.
- **P4:** Dragging, snapping, mathematical state, lesson scene actions and Presets keep their behavior. Listeners are owned by their points and disposed with them.
- **P5:** Consistency is enforced by construction or by a static check. No new test mounts every graph; see [verification throughput](verification-throughput.md#keeping-it-from-regrowing).

## Verification

- Slices 1–3: focused unit tests for the touched components, typecheck, lint, production build, and browser screenshots at the widths named above in both languages.
- Slice 4: host tests for the two reported graphs, plus real hover and drag in a browser on Interval Sweep, blossoming and one Bézier graph.
- Smoke: the affected routes only (Home, Demonstrations, one chapter, the three graphs above). The full checklist is not needed unless slice 4 changes a shared graph base.
