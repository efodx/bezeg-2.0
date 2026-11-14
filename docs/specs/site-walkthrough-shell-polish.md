# Site walkthrough: shell and label polish

Status: complete, 2026-11-14, run by the `polish` session ([queue](../tasks/site-walkthrough/polish.md), [state note](../reviews/site-walkthrough/polish/state.md)). Package B of the [site walkthrough intake](site-walkthrough-intake-2026-11-14.md#11-disposition-2026-11-14). Every item is implemented and published with the owner's approval where it depended on his taste: D02 as proposed, H05 as the outlined flower, L02 and L03 as option 2, M03 in both stages with compact labels. See [completion evidence](#completion-evidence); what was left out and why is under [not converted](#not-converted).

Approval rule (owner, 2026-11-14): items with one correct result are pushed when verified. Items that depend on his taste (H05, D02, L02, L03) are shown in a preview and pushed only after he approves. M03 gets an inventory and a recommendation; graphs beyond the two reported ones are migrated only after his answer.

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

### Recommendation for the shared movable-point path (M03, approved by the owner, both stages)

From the [point inventory](../reviews/site-walkthrough/point-inventory.md) of all 138 registered graphs, before the M01 / M02 fix:

| Group | Graphs | After the fix |
| --- | --- | --- |
| Shared cursor binding and shared math labels | 58 | 80 (the 22 point-set graphs joined) |
| Shared control points, plain scene texts (B-spline scenes) | 5 | blossoming fixed; 4 left |
| Own copy of the cursor code, plain labels | 14 | unchanged |
| Draggable points, no hover cursor, math labels | 7 | unchanged |
| Draggable points, no hover cursor, plain labels | 30 | 8 left (4 projective, 4 curve scenes) |
| No draggable point | 24 | unchanged |

The divergence is not deliberate anywhere the inventory read: the 14 copies repeat the two lines of `bindMovablePointCursor`, six of them without its `fixed` test, and the graphs without a cursor simply never called it. `createMovablePoint` in `src/graphs/base/points/pointFactory.ts` already exists and has no callers.

Recommendation: one creator owns both the cursor binding and the label attributes, and the remaining graphs move to it in two stages.

1. **Cursor (no visual change).** `createMovablePoint` takes the point style and binds the cursor. The 14 own copies and the 15 draggable-without-cursor graphs call it or `bindMovablePointCursor`, in file-disjoint batches by family. A static check (a unit test that scans `src/graphs` sources, mounting nothing) fails on a `style.cursor` write outside the binding and on a draggable `create('point'` outside the creator, the curve base and an allow-list of fixed marks. This satisfies P5 by construction.
2. **Labels (changes how about 27 graphs look).** Point labels that name a mathematical object take the shared label attributes, as the point-set graphs now do. Number readouts and captions stay plain text; each batch lists which texts it left and why. This stage should land before package D recaptures the affected graphs, so captures are recorded once.

Alternatives: stage 1 only (every draggable point advertises dragging, labels stay as they are), or leave the remaining graphs and fix them as they are reported. Stage 1 alone is about 29 small file edits plus the check; stage 2 needs a screenshot review per family.

The owner approved both stages on 2026-11-14. They were carried out as the [movable-point task](../tasks/site-walkthrough/movable-points.md) records: stage 1 binds the cursor with `bindMovablePointCursor` where each point is created (the unused `createMovablePoint` stays as it is), and stage 2 uses a compact named-label style, which the owner chose over the full display size after seeing both.

## Completion evidence

Recorded 2026-11-14. Before and after screenshots, with one page that pairs them, are in [the evidence folder](../reviews/site-walkthrough/polish/evidence/index.html); the scripts that produced them (`shots.cjs`, `corners.cjs`, `points.cjs`, `gallery.cjs`) are beside it. Before pictures are from a production build of `dbf3ff60`; after pictures are from a production build of the proposals branch, which holds every item below.

| Criterion | State | Evidence |
| --- | --- | --- |
| C1 | Met | First catalog card at 1440, 1024 and 390 px in `sl` and `en`, at rest, on hover and with the clip playing (playing observed at 1024 and 390 px; at 1440 px the clip did not start in the scripted hover, and the image and video share one rule): card radius 10 px, capture inset 5 px with radius 5 px, image and video alike. |
| C2 | Met, owner approved | D02: topic list 14 px; card family line reuses the homepage carousel eyebrow (11 px, 700, .08em, uppercase); actions 13 px with the homepage arrow. Sizes are ones the shell already uses; `shellTokens.css` has tokens only for display type, so the card title keeps 19 px, the floor of `--bezeg-type-item`. Published in `8b928549`. |
| C3 | Met | Card box identical before and after D01 (330 × 401.69 at 1440 px, 358 × 399.3 at 390 px). Actions keep `min-height: 44px`; the topic list keeps its sticky rule and 44 px rows. |
| N1 | Met, owner picked option 2 | Previous and next show the chapter title and one chevron; the return link is small caps with the same chevron. Screenshots at 1440, 820, 390 and 360 px in [round 2 evidence](../reviews/site-walkthrough/polish/evidence-round2/). Published in `12dceb86`. |
| N2 | Met | Neighbour cards keep their position at all four widths; their height goes from 72 to 73 px. |
| N3 | Met | `ChapterPage.test.tsx` asserts the link text and one accessible name; `tests/unified-learning.smoke.spec.cjs` passes. Not checked through a browser's accessibility tree. |
| F1 | Met | No `footer` on the homepage; the page ends with the carousel and its own bottom padding (40 px at 1440 px, 32 px at 390 px), in both languages. Typecheck, the homepage unit test, the production build and the homepage smoke spec pass. |
| F2 | Met, owner picked the outlined flower | H05: the header mark is the outlined elderflower without its tile, centred on the wordmark's line. Header 73 px (desktop) and 65 px (phone) unchanged; one row at 390 and 360 px. The owner judged the green tile the problem, so the header uses a new mark file while `elderflower.svg` and the tab and phone icons stay. `tests/home.smoke.spec.cjs` passes. Published in `aa16744f` (rebased into master before `8ed2f453`). |
| P1 | Met | Production preview, 1440 px: all ten Interval Sweep points give `pointer` on hover and `default` on exit, as the control points of `/bezier/curve` do. The fixed Voronoi vertices give no cursor. |
| P2 | Met | `mjx-container` elements inside the board texts of Interval Sweep went from 0 to 15 and on blossoming from 4 to 5; before and after screenshots of both. Host tests assert `useMathJax`, `parse: false` and the math text. |
| P3 | Met | [Point inventory](../reviews/site-walkthrough/point-inventory.md). Every row that differed is migrated by the [movable-point task](../tasks/site-walkthrough/movable-points.md) (cursor: 29 graphs and ten further files; labels: 18 graphs) or listed under [not converted](#not-converted). |
| P4 | Met | Elements keep their JSXGraph names; existing host tests for point sets, intervals, segments and blossoming pass, with three label assertions updated to the math text. Real drag on Interval Sweep, Delaunay, Voronoi, convex hull, segment intersections and Fortune: 16.7 ms median frame interval, 16.8 ms maximum. Listeners are bound on the point and go with it. Stage 1 and 2: unit tests of every touched graph pass; element names are unchanged; the 14 graphs that removed their own hover handlers on dispose register the binding's release, and their ownership tests pass. Drag cost with the typeset labels of stage 2 was not measured. |
| P5 | Met | `src/graphs/base/movablePointCursor.static.test.ts` reads the sources under `src/graphs`, mounts nothing, and fails on a `style.cursor` write outside the binding and on a point drag handler in a file that does not reach the binding, unless allow-listed with a reason. Seen failing on 17 files before stage 1 and on ten more before batch 1c. |

User impact:

- **H01.** The homepage no longer shows the project description, the author and supervisor credit or the contact line. The owner confirmed all three go; contact details return when he shares the site. The three localization keys are removed from `sl.ts` and `en.ts`.
- **D01.** Catalog posters and clips fill their inset frame, which trims about 1.5 px from the top and bottom of the picture.
- **M03, stage 1.** Every draggable point shows the pointer cursor on hover. Six graphs that showed it on fixed points too no longer do.
- **M03, stage 2.** On 18 graphs the names of points, lines and sides are typeset as math at 75 % of the display font size: Obodni kot, Simsonova premica, Inverzija, Točka v mnogokotniku, Znamenite točke, Eulerjeva premica, Geometrija premic, Reševanje trikotnika, Izometrije (`k`), Spust (`A`, `B`), the five projective graphs and the three interpolation graphs. They follow the display font size and keep their previous placement and visibility. Posters and clips of these graphs show the old labels until package D recaptures them.
- **M01.** Labels of the 22 point-set graphs follow the display font size instead of a fixed 14 px. Catalog posters and clips of these graphs and of blossoming show the old labels until package D recaptures them.

No route or stored-preset change.

Not verified: a real touch device; the catalog clip playing at 1440 px; high-contrast mode; the catalog smoke spec (`tests/demonstrations.smoke.spec.cjs`) against the D02 proposal. Smoke that did run on the production build with every item: the guided-lesson rows `interval-sweep`, `bspline-blossom`, `convex-hull` and `voronoi`, `tests/unified-learning.smoke.spec.cjs` and `tests/home.smoke.spec.cjs`, all passing. The other point-set lessons were not run.

### Not converted

- **Captions and readouts.** Texts in words and number readouts stay plain by decision; the worker notes list them per file.
- **`CircleConstructionGraph` (`P`, `T1`, `T2`) and `KinematicsGraph` (`v`, `a`).** These names are caption texts placed by layout code that measures plain text, not point labels. They were left for a separate change with its own layout check.
- **Line names `p`, `p′` on Dvorazmerje** start left of the board edge; this was so before and is unchanged.
- **No hover evidence in a browser:** `complex-roots` (square handle), `bspline/basis`, `Descent`, and the composition, eigen and iteration views of the linear map. The static check covers their files.
- **Stage 2 was reviewed on each graph's default view only**, from before and after pictures at 1440 px. The new label assertions of CrossRatio, ThreeViews, LineGeometry, TriangleSolver and Descent were not seen failing before the change.

## Verification

- Slices 1–3: focused unit tests for the touched components, typecheck, lint, production build, and browser screenshots at the widths named above in both languages.
- Slice 4: host tests for the two reported graphs, plus real hover and drag in a browser on Interval Sweep, blossoming and one Bézier graph.
- Smoke: the affected routes only (Home, Demonstrations, one chapter, the three graphs above). The full checklist is not needed unless slice 4 changes a shared graph base.
