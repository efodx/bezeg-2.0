# 1. Shell tokens, backdrop and typography

Status: planned. Source: [specification](../../specs/learn-landing-visual-alignment.md#shell-alignment) (Typography, Shell alignment).

## Scope and entry points

- `src/learning/LearningPage.css` landing rules (lines 1–58 and the ≤700px block at 59–81 on 2026-10-31); not the chapter-shared rules after the `/* Shared with the chapter readers. */` comment.
- `src/learning/LearningPage.tsx`: the `<header className="learning-heading">` block (eyebrow only; the opening layout is task 2).
- References: `src/shellTokens.css`, `src/DemonstrationsPage.css` (grid `::before`), `src/WelcomePage.css` (`.welcome-eyebrow`, `h1` scale).

## Implementation and acceptance

- Replace every hard-coded hex in the landing rules with `--bezeg-shell-*` tokens (ink, ink-secondary, action, action-hover, rule, media-rule, preview-panel, ochre, focus, …). Drop the `var(--bezeg-canvas, #f4f0df)` fallback in favour of `--bezeg-shell-canvas`.
- Add the 48px grid backdrop with `--bezeg-shell-grid`, `isolation: isolate` on the page and the Demonstrations mask. It must not intercept pointer events or cause horizontal overflow.
- Widen `.learning-page-inner` to 1100px.
- Add the eyebrow "Bezeg · Učenje" / "Bezeg · Learn" styled like `.welcome-eyebrow`.
- Page heading (`h1`) and strand headings (`h2`) switch to the inherited system sans at 700 weight; the h1 follows the home/catalog scale (about `clamp(34px, 4.2vw, 52px)`). Chapter titles (`.learning-topic-heading`) keep Georgia but take their colour from `--bezeg-shell-ink`.
- No hex colour remains in the landing rules (`grep -nE "#[0-9a-fA-F]{3,6}"` over those lines is empty).

## Verification

`just unit src/learning/LearningPage.test.tsx`, typecheck, build. Browser-check `/learn` at 1440×900 in both languages: grid visible and matching Demonstrations, canvas identical to home.
