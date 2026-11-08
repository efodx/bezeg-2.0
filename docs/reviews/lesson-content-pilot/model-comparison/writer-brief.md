# Model comparison: writer brief

This brief is shared by every writer in the [lesson content pilot](../../../specs/lesson-content-pilot.md) model comparison. Each writer does one single-shot rewrite of all four lessons from the same inputs.

## Role

You write Slovenian lesson text only. You may create files only in your output directory, `docs/reviews/lesson-content-pilot/model-comparison/drafts/<config>/`. Do not edit `src/`, commit, or push.

Working directory: `C:\Users\1337Hacker\Desktop\bezeg-2.0\.claude\worktrees\lesson-content-pilot`

## Inputs: read these, and only these, under docs/reviews/

- `lesson-content-pilot/style-brief.md`: the binding rules.
- `lesson-content-pilot/round-1/merged-findings.md` and `lesson-content-pilot/round-1/<lesson>.{struggling,curious,reluctant}.md`.
- `lesson-content-pilot/scripts/<lesson>.r0.md`: the current lesson. Its format is the format you produce.
- `lesson-content-pilot/extraction-notes.md`: what the runtime shows.

**Do not read** any `*.r1.md` or `*.r2.md` script, anything in `changes/`, `round-2/`, `round-3/` or `model-comparison/` other than this brief, or `docs/reviews/lesson-content-pilot.md`. Other writers' work must not influence yours.

You may read lesson source, demonstration controls and readouts, `src/localization/sl.ts` and `docs/localization.md` by section, so that every action, label and location you name really exists.

## Lessons

| Lesson id | Source |
| --- | --- |
| `bezier-pilot` | `src/learning/content/guidedLessons.ts` |
| `subdivision-guided` | `src/learning/content/constructionGuidedLessons.ts` |
| `curve-curvature-guided` | `src/learning/content/curveGeometryGuidedLessons.ts` |
| `polynomial-zeros-guided` | `src/learning/content/schoolFunctionGraphsBatchBGuidedLessons.ts` (secondary-school register) |

## Task

For each lesson, write `drafts/<config>/<lesson-id>.md`: a complete lesson in exactly the r0 script format (steps, frames, `[besedilo]`, `[navodilo za opazovanje]`, `[skrito pod 'Kaj bi morali opaziti']`, `*Na grafu: ...*`). Use the same title line format as r0, but drop the "(lesson script r0)" suffix. Do not mention yourself, the model or the round anywhere in the file.

Rules:

- Restructuring is allowed, but every scene must be achievable with the existing demonstration.
- Keep the mathematics correct.
- Use `\(...\)` and `{,}` for decimal commas.
- The generic finish screen after the last step is fixed app chrome, so your last step carries the payoff.

Then write `drafts/<config>/notes.md` (≤200 words): your hook per lesson, step counts, and any label or location you could not confirm.

## Return

At most 120 words: files written and step counts.
