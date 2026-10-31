# 2. Two-column opening with count line

Status: planned. Source: [specification](../../specs/learn-landing-visual-alignment.md#opening).

## Scope and entry points

- `src/learning/LearningPage.tsx`: the `learning-heading` header, `countLabel` and the `sectionCount`/`exampleCount` helpers.
- `src/learning/LearningPage.css`: `.learning-heading`, `.learning-open`, `.learning-start`.
- Reference layout: `.welcome-intro` and `.welcome-primary` in `src/WelcomePage.css`; meta styling from `.demonstrations-catalog-intro > span` in `src/DemonstrationsPage.css`.

## Implementation and acceptance

- Grid with areas `"eyebrow action" "title action" "copy action" "meta action"` on desktop; stacks to a single column below 820px with the action under the copy, start-aligned.
- Replace the two paragraphs with the single approved paragraph (sl and en text in the spec).
- Add the count line, computed from `learningChapters` and `chapterOutline` totals; add `chapterCount` with sl forms poglavje/poglavji/poglavja/poglavij and en chapter/chapters. At the time of writing it reads "9 poglavij · 55 razdelkov · 67 vodenih primerov" / "9 chapters · 55 sections · 67 guided examples".
- The start action uses the home primary-action treatment: `--bezeg-shell-action`, hover `--bezeg-shell-action-hover`, 48px height (44px at ≤700px), 8px radius, `--bezeg-shell-shadow-action`, `white-space: nowrap`.
- Add a unit test for the count line (both languages) and for `countLabel` plural selection of the chapter noun at 1, 2, 3 and 5. Update any test asserting the old intro copy.

## Verification

`just unit src/learning/LearningPage.test.tsx`, typecheck, build. Browser-check 1440×900, 900px and 390px in both languages, including a live language switch.
