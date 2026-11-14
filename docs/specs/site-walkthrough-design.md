# Site walkthrough: design decisions (package C)

Status: **proposed, waiting for the owner's choices** (2026-11-14). No option below is decided and no app code has changed.

Source: [site walkthrough intake](site-walkthrough-intake-2026-11-14.md), sections 4, 5, 6, 9 and 11. Covers H02, H03, H04, L01, L04, L05, P01 and P02, and proposes subjects for G07, which the `graphs` session implements.

Mockups: [gallery](../reviews/site-walkthrough/design/index.html), images in `docs/reviews/site-walkthrough/design/img/`. Each image is the real page of the production build at `dbf3ff60` with the option applied as injected CSS or DOM (`mockups.mjs`, `epicycles-subjects.mjs` in the same folder). They show appearance only; no behaviour was implemented.

## How this is decided

The owner picks an option per item from the gallery. The handler records each pick here with its date, then implements it. Engineering choices inside a picked option stay with the handler. Until then the "Recommended" entries are recommendations only.

## Items

### H02: homepage selection

Settled by the owner: a rotating selection from a curated pool of attractive demonstrations, replacing the fixed six of [homepage carousel and catalogue](homepage-carousel-and-demonstrations-catalogue.md) (`bezier`, `bernstein`, `rational`, `spline-c1`, `ph-cubic`, `derivative`). That spec's requirement to keep those six ids and their order is replaced when this ships, and the change is recorded there.

Open details:

| Detail | Recommended | Alternatives |
| --- | --- | --- |
| Pool | The owner's nine positive references: `epicycles`, `fixed-point`, `accumulation`, `definite-integral`, `function-inverse`, `complex-multiplication`, `subdivision`, `darboux`, `decasteljau`. `convexity` joins when G06 (its capture skips frames) is fixed. | A wider pool with entries from more families. |
| Label | "Izbor demonstracij" / "A selection of demonstrations": reads as a sample and not as the visitor's own choice. | "Izbrane demonstracije" / "Featured demonstrations"; "Za pokušino" / "A taste". |
| Rotation | Six at random on each full page load; the set is kept in memory for the visit, so returning to Home shows the same six. Nothing is stored. | One set per day, the same for everyone (suits a classroom); the whole pool shuffled. |

The app stays static and client-only under every alternative.

### H03: carousel navigation

| Option | Description |
| --- | --- |
| A (recommended) | Remove the arrows and the counter. The six choices become picture cards filling the row; the selected card shows a progress line while the selection advances. |
| B | Remove the counter; quiet arrows sit on the edges of the large preview; the tile strip is unchanged. |
| C | Remove the arrows and the counter; tiles unchanged. |

Reason for A: it is the owner's suggested direction, and a card shows what a demonstration looks like where a 52 px thumbnail cannot. Arrow-key navigation, autoplay pauses and manual takeover stay in every option. Cost of A: the row is taller, so at 1440 × 900 its lower edge is below the first viewport; the earlier spec's first-viewport target is relaxed for the card row and recorded there.

### H04: route to the learning overview

| Option | Description |
| --- | --- |
| A (recommended) | A second button, "Vsa učna vsebina →", beside "Vse demonstracije →", linking to `/bezeg-2.0/learn`. The wording matches the chapter return control. |
| B | Two larger "door" cards, Demonstracije and Učenje, each with one line of description. |

Reason for A: least weight, and the selection stays high on the first screen.

### L01: chapter section numbering

Today `ChapterPage` (Bézier curves) prints a two-digit number beside each section heading and a number in the contents list (`showNumbers`); `FamilyChapterPage` prints neither.

| Option | Description |
| --- | --- |
| A | No numbers anywhere. |
| B (recommended) | Numbers on headings and in the contents list in every chapter. |
| C | Numbers in the contents list only. |

Reason for B: a number ties a heading to its contents line and gives a teacher something to say aloud. Whichever option is picked is implemented once in the shared heading and contents components, not per page, so chapters cannot diverge again.

### L04: guided example Back button

| Option | Description |
| --- | --- |
| A | Outline only, transparent. |
| B (recommended) | Sage tint, the colour the lesson panel uses for formula and note boxes. |
| C | Quiet text without a frame, like the panel's "Skrij" and "Končaj". |

Reason for B: it keeps the placement and frame the owner likes. A is nearly indistinguishable from today because the panel is almost white; C loses the frame.

### L05: side botanicals on chapter reading pages

Settled by the owner: the branches appear on chapter reading pages. This reverses placement rule 2 of [side botanicals](side-botanicals.md); the reversal is recorded there when this ships.

| Option | Description |
| --- | --- |
| A (recommended) | The same treatment as Home, Demonstrations and Learn. |
| B | Half strength on chapter pages. |

Reason for A: the owner does not find the decoration distracting, and one treatment is simpler. Finding for implementation: `.chapter-layout` spans the window, so the content column must be marked on the element that bounds the contents list and the article (including margin notes), or the gutters measure as zero. The 1600 px width gate and reduced-motion behaviour stay.

### P01: save-preset dialog

| Option | Description |
| --- | --- |
| A (recommended) | Keep a dialog, in the site's style: cream panel, display-face title, green action, "Prekliči" in place of "Zapri", and one line saying that saving stores the graph's current state in this browser and overwrites a preset of the same name. The style applies to all four preset dialogs (save, delete, import, figure batch). |
| B | No dialog: the name field opens inside the Shrani tab. |

Reason for A: one change modernizes every preset dialog. B belongs with the P02 panel.

### P02: presets experience

Current flow (inspected 2026-11-14, `src/graphs/base/PresetSelector.tsx`): a help line, a dropdown of preset names with "Privzeta" first, and six equally weighted buttons: Ponastavi, Shrani, Izbriši, Izvozi prednastavitve, Uvozi prednastavitve, Generiraj slike za prednastavitve. Saving asks for a name in a modal and silently overwrites a preset of the same name. Delete asks "yes / no" in a modal whose buttons sit in the body. There is no rename. Presets are stored per graph in browser storage as `{id, data, boardState, graphState}`, where `id` is the name.

Proposal:

1. Saved states are a list of rows, not a dropdown; the selected row is marked, and "Privzeto stanje" is the first row.
2. One prominent action, "Shrani trenutno stanje …", opens the name field in the panel (P01 option B).
3. Each row has a menu: rename, overwrite with the current state, delete. Overwriting is then explicit instead of a side effect of reusing a name.
4. Export and import sit under their own heading, "Varnostna kopija", with a sentence on what the file is for.
5. The figure batch moves beside the image export.
6. Optional wording change, the owner's choice: "prednastavitve" becomes "shranjena stanja" in the interface. Code and file format keep "preset".

Constraints: the stored preset shape, storage keys and the export file format do not change, so stored presets stay readable and import validation is untouched. Rename rewrites `id` in place. If a later step needs a shape change, its reason and user impact are recorded here first. The panel is a graph inspector panel, which [control choice and composition](control-choice-and-composition.md) owns; this work is coordinated with that stream and built from [the controls catalogue](../controls.md).

### G07: epicycles subject (owner's choice; implemented by `graphs`)

Candidates, each traced with 6, 20 and 60 circles in the gallery: the outline of Slovenia, a treble clef, a cat silhouette, an elderflower blossom. The cat and Slovenia show the largest difference between few and many circles. The blossom is nearly complete at six circles and so demonstrates little. The Slovenia outline in the mockup is a rough hand sketch; an implementation would use accurate border data.

## Acceptance criteria

Draft; each applies to the option the owner picks.

- H02: the homepage section shows six demonstrations drawn from the pool list; the pool is one exported list; the section heading and the choice group's accessible name use the new label in both languages; a test with an injected random source covers the draw and the no-reshuffle-within-a-visit rule; no network or storage use.
- H03: the homepage has no counter (and no arrow buttons under options A and C); every choice is reachable by pointer, touch and keyboard; arrow keys, autoplay pauses, manual takeover and reduced motion behave as before; no page-level horizontal overflow at 1440, 1024 and 390 px; screenshots at those widths.
- H04: the introduction has a visible link to `/bezeg-2.0/learn` in both languages, reachable by keyboard after the demonstrations link.
- L01: every chapter follows the picked convention, produced by shared components; a test renders one `ChapterPage` and one `FamilyChapterPage` chapter and asserts the same convention.
- L04: the Back button uses the picked style in enabled, hover, focus and disabled states, with text contrast of at least 4.5:1; placement and size are unchanged; screenshot of the lesson panel.
- L05: at 1600 px and wider, chapter reading pages show the branches in both gutters without overlapping the contents list, the article or margin notes; below 1600 px nothing is rendered; no decoration in the graph workspace or lessons; reduced motion shows no animation; `side-botanicals.md` records the reversal; screenshots at 2560 and 1920 px.
- P01: the four preset dialogs share the site's dialog style; the save dialog says what saving does and that a same-named preset is overwritten; focus moves into the dialog and returns to its trigger; screenshots at desktop width and 390 px.
- P02: as picked from the proposal; existing stored presets and previously exported files load unchanged (covered by the existing preset tests plus a rename test); screenshot of the panel at inspector width (310 px).
- Each shipped slice: focused unit tests, typecheck and production build after localization changes, and a smoke check of the affected routes.

## Coordination

- `src/WelcomePage.*` belongs to the `polish` session until its slice 3 (footer, header brand) is on `master`; on 2026-11-14 it was not. H02, H03 and H04 start after it lands.
- Chapter previous / next navigation and the "Vsa učna vsebina" control (L02, L03) belong to `polish`.
- Localization edits are pushed promptly.
