# 4. Phone layout, verification and DESIGN.md

Status: planned. Source: [specification](../../specs/learn-landing-visual-alignment.md#phone-700px) (Phone, Acceptance criteria).

## Scope and entry points

- `src/learning/LearningPage.css`: the `@media (max-width: 700px)` landing block and any 820px rules from task 2.
- `DESIGN.md`: add a "Learn landing" section after "Guided lesson reading overlay".
- `docs/specs/learn-landing-visual-alignment.md` and this queue: mark status complete with evidence.

## Implementation and acceptance

- ≤700px: 16px page gutter, cards full width with reduced inner padding, thumbnail top-right beside the title (about 92–110px), read link and Contents on one wrapped line, rows separated by the card hairlines (no duplicate border rule).
- No horizontal page scroll at 320px and 390px; long Slovenian titles wrap rather than overflow.
- Page height at 390×844 with every Contents closed is below the 2026-10-31 baseline of about 3,300px; record the new height.
- DESIGN.md "Learn landing" section: sans page/strand headings with Georgia chapter titles, eyebrow and count line, strand card surface and shadow, ochre-bar strand headings, text-link read action, row hover tint, grid backdrop without botanical art.
- Walk through every acceptance criterion in the spec and record the result in the spec's status line.

## Verification

Full Learn checks: typecheck, lint, `just unit src/learning`, build, `tests/unified-learning.smoke.spec.cjs`. Browser-check `/learn` at 320, 390, 820, 1440 and 1920 widths in sl and en with a live switch, and confirm `/` and `/demonstrations` are unchanged. Smoke-test the Learn route with `$smoke-tester` because a route's rendering changes.
