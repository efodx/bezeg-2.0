# 3. Strand cards and calmer chapter rows

Status: planned. Source: [specification](../../specs/learn-landing-visual-alignment.md#strand-cards) (Strand cards, Chapter rows).

## Scope and entry points

- `src/learning/LearningPage.tsx`: the strand `<section>`, `<ol className="learning-path">` and the `learning-family` row markup (move `.learning-read` beside the Contents summary).
- `src/learning/LearningPage.css`: `.learning-strand`, `.learning-path`, `.learning-family` (grid areas and the `::before` connector at `left: 91.5px`), `.learning-thumb`, `.learning-read`, `.learning-outline`.
- References: `.welcome-showcase h2::before` (ochre bar) in `src/WelcomePage.css`; `--bezeg-shell-shadow-card` in `src/shellTokens.css`.

## Implementation and acceptance

- Strand heading: 22px sans with the 38×3px ochre bar above, no trailing hairline.
- The `<ol>` becomes the card: preview-panel surface, media-rule border, 16px radius, a softer card shadow (lighter than `--bezeg-shell-shadow-card`; define it as a new `--bezeg-shell-shadow-panel` token if reused), inner padding, hairlines between rows.
- Thumbnail about 220px wide without its own border; recompute the path connector so it runs through the thumbnail centres and stays inside the card (first/last row trims still work).
- Row hover: `--bezeg-shell-choice-hover` background with the existing 0.15s transition, disabled under `prefers-reduced-motion`. No stretched link.
- "Preberi poglavje →" becomes a text link (`--bezeg-shell-action`, 700, ≥44px tall, underline on hover) sharing a wrapped line with the Contents summary; it keeps the `.learning-read` class. The open Contents list still appears below that line.
- Contrast ≥4.5:1 for body, meta and link text on both the panel and the hover tint (record the measured ratios in the task report).
- Hash links (`/learn#bezier-patches`) still scroll the row clear of the header.

## Verification

`just unit src/learning/LearningPage.test.tsx`, typecheck, lint, build, then the Learn rows of `tests/unified-learning.smoke.spec.cjs` on the production build. Browser-check 1440×900 and 1920×1080 in both languages, keyboard Tab order and focus visibility through one row.
