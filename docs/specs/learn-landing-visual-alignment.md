# Learn landing visual alignment

Status: implemented 2026-10-31 (tasks 1-4). Acceptance: 1-3 pass (grid backdrop, eyebrow/count/start, cards, no hex in landing rules); 4 focus outline 3px shell token on every link and summary verified, contrast not re-measured in task 4; 5 pass (390px: no horizontal scroll, sl 2903px / en 3037px vs ~3,300px baseline, Contents closed); 6 pass (live sl/en switch updates eyebrow, copy and counts); 7 unit passes, smoke run left to CI unless noted in task 4; 8 pass (DESIGN.md "Learn landing"). Source: owner request, 2026-10-31: "The homepage/demonstrations page feel and look way nicer than the Learn page. Help me with making Learn page also look nice." The owner approved every proposal below and the three open decisions (typography split, landing-only scope, copy additions). Work queue: [tasks](../tasks/learn-landing-visual-alignment/README.md).

This is a visual refinement of `/bezeg-2.0/learn` (`src/learning/LearningPage.tsx`, `src/learning/LearningPage.css`). It keeps the structure decided in [Learn navigation redesign](learn-navigation-redesign.md): three strands in the existing order, a heading link, thumbnail, purpose, a quiet "Read the chapter" action and the native Contents disclosure per chapter, no step numbers, and no direct lesson links.

## Problems observed

Comparison of production-build renders at 1440×900 and 390×844 against `/` and `/demonstrations`, 2026-10-31:

1. **No shared atmosphere.** Home and Demonstrations draw the faint 48px graph grid (home also adds the elderflower artwork). Learn is flat, and its canvas falls back to `var(--bezeg-canvas, #f4f0df)`, a visibly yellower cream than the shell's `--bezeg-shell-canvas` (`#f7f5e9`).
2. **Different voice.** Home and Demonstrations open with the small "Bezeg · …" eyebrow and a large bold system-sans heading. Learn uses a smaller Georgia heading, so it reads as a different site.
3. **Palette drift.** `LearningPage.css` hard-codes about ten greens and greys (`#315e3b`, `#284d31`, `#25402b`, `#314a35`, `#4d5f4d`, `#5d6c58`, `#315d3b`, `#75826e`, `#243b2b`, `#577cc3`) that approximate shell tokens without matching them.
4. **Flat, repetitive rhythm.** Nine rows sit directly on the page with an identical outlined "Preberi poglavje" button on the right; that column of buttons dominates the desktop view. Home earns depth with a panel, the card shadow, the 5px green rail and the ochre section bar.
5. **Weak opening.** A 960px column with two stacked paragraphs and the action below leaves the right half of the first viewport empty; home places its action beside the copy.
6. **Long phone page.** About 3,300px at 390px, with nine near-full-width buttons.

## Decisions

### Typography

- The page heading and the strand headings use the shell's system sans, at home/catalog weight and scale.
- Chapter titles keep Georgia: it is the reading voice of the chapter pages, so the titles bridge into them.

### Shell alignment

- Use shell tokens from `src/shellTokens.css` for every colour role; no new hard-coded hex values remain in `LearningPage.css` (the chapter-shared rules at the end of the file are out of scope, see below). Focus uses `--bezeg-shell-focus`.
- Canvas is `--bezeg-shell-canvas`. Add the 48px grid backdrop using the Demonstrations page technique (`::before`, `--bezeg-shell-grid`, a vertical mask). No botanical artwork: it stays the homepage's signature.
- Content width becomes 1100px, matching home.
- Add the eyebrow, styled like `.welcome-eyebrow`: **"Bezeg · Učenje"** / **"Bezeg · Learn"** (matches the header's navigation label).

### Opening

- Two columns on desktop, like `.welcome-intro`: eyebrow, heading and copy on the left; the "Začni pri osnovah →" action on the right in the home primary-action treatment (`--bezeg-shell-action`, 48px, `--bezeg-shell-shadow-action`). Stack below 820px.
- Merge the two intro paragraphs into one:
  - sl: "Preberi razdelek, odpri vodeni primer ob grafu in se vrni k branju. Vrstni red je le predlog; vsako poglavje lahko odpreš samostojno."
  - en: "Read a section, open its guided example on the graph, then return to reading. The order is only a suggestion; any chapter opens on its own."
- Add a count line styled like the catalog's `.demonstrations-catalog-intro > span`, computed from content (never typed): **"9 poglavij · 55 razdelkov · 67 vodenih primerov"** / **"9 chapters · 55 sections · 67 guided examples"** at the time of writing. Reuse `countLabel`; add the chapter noun forms (sl: poglavje, poglavji, poglavja, poglavij; en: chapter, chapters).

### Strand cards

- Each strand becomes a panel: `--bezeg-shell-preview-panel` surface, `--bezeg-shell-media-rule` border, 16px radius, a softer variant of the card shadow. No green rail: that stays reserved for home's featured card.
- Strand headings sit above their card in the home section style: 22px sans (20px narrow) with the 38×3px ochre bar above. Remove the trailing hairline.
- Chapter rows inside a card are separated by `--bezeg-shell-rule` hairlines. The thumbnail path connector stays, recomputed for the new thumbnail width, and stays inside the card.

### Chapter rows

- Thumbnails grow (about 220px on desktop) and drop their own border inside the card; keep `aspect-ratio: 18 / 11` and `object-fit: contain`, and the existing bilingual alt text.
- Row hover tints the row with `--bezeg-shell-choice-hover`. No stretched link: every existing link keeps its own target.
- "Preberi poglavje →" becomes a green text link (`--bezeg-shell-action`, 700 weight, ≥44px target) on the same line as the Contents summary and its counts. It keeps the `.learning-read` class.
- Keep `id={chapter.id}` on `.learning-family` and the hash scroll behaviour, with `scroll-margin-top` still clear of the header.

### Phone (≤700px)

- 16px side gutter; cards span the width with reduced inner padding; no horizontal page scroll.
- Thumbnail stays top-right beside the title; the read link and Contents share one wrapped line.

## Out of scope

- Chapter reader pages (`ChapterPage.css` and the chapter-shared rules at the end of `LearningPage.css`). A separate token pass there may follow as its own request.
- Structure, order, routes, presets and chapter content. No breaking changes.
- New fonts, botanical artwork on Learn, motion beyond the existing 0.15s hover transitions (keep `prefers-reduced-motion` handling).

## Acceptance criteria

1. At 1440×900 the first viewport shows the eyebrow, sans heading, merged copy, count line and right-side start action over the grid backdrop, on the shell canvas colour.
2. Strands render as three cards with ochre-bar sans headings; no column of outlined buttons remains.
3. `LearningPage.css` (landing rules) contains no hard-coded hex colours; all roles resolve to `--bezeg-shell-*` tokens.
4. Body text and labels keep ≥4.5:1 contrast on the card surface and on the row hover tint; focus stays visible on every link and the Contents summary.
5. At 390px: no horizontal scroll, 16px gutter, the page is shorter than the 2026-10-31 baseline (~3,300px) with Contents closed.
6. Slovenian and English both render correctly, including a live language switch; counts use correct Slovenian plural forms.
7. `LearningPage.test.tsx` and `tests/unified-learning.smoke.spec.cjs` pass unchanged, or are updated only for the intentional copy change; `.learning-family` and `.learning-read` remain.
8. DESIGN.md gains a short Learn landing section recording the typography split, strand card and row treatment.

## Verification

Typecheck, lint, `just unit src/learning/LearningPage.test.tsx`, production build, and the Learn rows of `tests/unified-learning.smoke.spec.cjs`. Browser-check `/learn` at 1440×900, 1920×1080 (projection) and 390×844 in both languages; check the `#bezier-patches` hash scroll and keyboard focus order.
