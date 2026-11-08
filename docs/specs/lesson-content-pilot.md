# Lesson content pilot

Status: accepted by the owner on 2026-11-08 (grilling session). Pilot complete; results await owner review in [the results document](../reviews/lesson-content-pilot.md). Supersedes, for the lessons it covers, the "rewrite later" clause of [one-shot lesson text](new-lesson-families.md#one-shot-lesson-text--owner-decision-2026-10-31).

## Goal

Lesson text across Bezeg is prototype quality: the pilots were written with care, the rest is one-shot. Before rewriting at scale, decide what good lesson content is **as experienced by the student**, then converge on a writing style by iterating on a few lessons. The lasting output is a lesson writing guide used to rewrite the remaining lessons.

Mathematics is not the focus. Reviewers flag only plainly broken mathematics.

## Reader

A student studying alone, at home, with no teacher ([independent study](../guardrails.md#independent-study-and-classroom-teaching)). Teachers use free exploration and their own lesson, so classroom projection is not judged.

## Pilot lessons

Whole lessons are evaluated, never individual guided examples in isolation.

| Lesson | Why |
| --- | --- |
| `bezier-pilot` | Bézier, carefully written pilot, the student's first contact |
| `subdivision-guided` | Bézier, one-shot construction, typical of most Bézier content |
| `curvature-guided` | Curve geometry, one-shot, non-Bézier |
| School function lesson on polynomial zeros (`schoolFunctionGraphsBatchBGuidedLessons.ts`) | Younger audience, lighter mathematics, stresses tone |

Once the voice is settled, the writing guide is checked against one `LessonDefinition` lesson (chapter or patch schema).

## Rubric

Every dimension is scored 1–3 per step and per lesson, each score backed by a quoted example.

1. **Clarity**: the student knows what to look at and what to do now.
2. **Text–graph coupling**: the text refers to what is on screen; the scene changes when the text says it does.
3. **Pacing and density**: about one idea per step; no walls of text, no filler steps.
4. **Motivation and narrative** (weighted double):
   - The opening gives a reason to care (a hook, question or puzzle), not a definition.
   - Each step answers or sharpens a question raised by the previous one.
   - The student can say in one sentence what the lesson is for.
   - The ending pays off the opening hook.
   - Curiosity comes before explanation ("what happens if you drag this?" before the answer).
5. **Agency**: the student acts (drags, predicts, tries) rather than only reads.
6. **Feedback**: what happens on success, failure or getting stuck.
7. **Tone and language**: natural Slovenian, consistent terms, friendly without being childish.
8. **Ending**: a recap of what was learned and a clear next step.

## Personas

Each lesson gets three blind reviewers, one per persona:

- **Struggling student**: weak algebra, easily lost, needs every instruction spelled out.
- **Curious, capable student**: bored by over-explaining, wants the why.
- **Reluctant student**: assigned the lesson, quits the moment it feels pointless.

## Pipeline

1. **Extract.** A worker produces a plain Slovenian *lesson script* per lesson containing only what the runtime shows the student, plus a one-line note per step describing the scene. The worker confirms from the runtime which fields are visible and documents the choice. Reviewers never read source.
2. **Review (text only).** Three persona reviewers per lesson score the script against the rubric.
3. **Merge.** The handler merges and calibrates findings across all four lessons and writes a short shared style brief.
4. **Rewrite.** One writer per lesson drafts Slovenian rewrites from the merged findings and the style brief. Rewrites may restructure steps and scene behaviour; structural changes are labelled separately from pure text edits so the owner can accept them independently.
5. **Iterate.** Each round uses fresh persona reviewers who read only the current script, with no earlier drafts or diffs. Stop when every persona scores motivation and narrative 3/3 and no dimension is below 2, or after 3 rounds. If the cap is reached, report the dimensions that still fail.
6. **Owner review.** The owner reads the side-by-side result. Only after approval are changes applied to source, English updated to match, and the writing guide written into `docs/`.

Slovenian only until approval; English follows the approved Slovenian.

## Deliverables

- `docs/reviews/lesson-content-pilot/`: extracted scripts, per-round persona reviews, merged findings, the style brief, and score history.
- `docs/reviews/lesson-content-pilot.md`: the side-by-side current and proposed text per lesson, with structural changes labelled and the final scores.
- After approval: source changes, English lockstep, and the lesson writing guide.

## Acceptance

- [x] Four scripts extracted, with visible fields documented.
- [x] Round-1 reviews: three personas × four lessons, every score quoted.
- [x] Merged findings and style brief.
- [x] Rewrites iterated until the stop rule is met or the 3-round cap is reached, with the score history recorded.
- [x] Side-by-side review document ready for the owner.
