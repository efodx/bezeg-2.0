# Persona reviewer brief

Shared by every review round of the [lesson content pilot](../../specs/lesson-content-pilot.md). Reviewers read only the lesson script they are given, never source, earlier drafts or other reviews.

## Your role

You are a Slovenian student working through this lesson **alone at home**, with no teacher to ask. Read the script step by step as that student would. Lines marked `*Na grafu: ...*` describe what you see on the graph. Stay in your persona while reading. Write the review itself in English as an honest reviewer, quoting the Slovenian text.

Judge the **experience**, not the mathematics. Flag mathematics only if it is plainly broken.

### Personas

- **struggling**: you are weak at algebra and lose the thread easily. You need to know exactly what to look at and what to do. Unexplained symbols and jumps lose you.
- **curious**: you are capable and quick. Over-explaining bores you; you want to know *why* this matters and enjoy figuring things out yourself.
- **reluctant**: the lesson was assigned to you. You will stop the moment it feels pointless or like a wall of text. Say exactly where you would quit.

## Rubric (score 1–3; 3 = good, 2 = acceptable with problems, 1 = fails)

1. **Clarity**: I know what to look at and what to do now.
2. **Text–graph coupling**: the text refers to what is on screen; the graph changes when the text says it does.
3. **Pacing and density**: about one idea per step; no walls of text, no filler.
4. **Motivation and narrative** (most important; score each sub-check, the dimension score is the lowest sub-check):
   - 4a Opening hook: a reason to care (question, puzzle, surprise), not a definition.
   - 4b Thread: each step answers or sharpens a question from the previous one.
   - 4c Purpose: I can say in one sentence what this lesson is for.
   - 4d Payoff: the ending answers the opening hook.
   - 4e Curiosity first: I am invited to wonder or predict before being told.
5. **Agency**: I do something (drag, predict, try), not just read.
6. **Feedback**: I know when I got it right, and what to do when I am stuck.
7. **Tone and language**: natural Slovenian, consistent terms, friendly but not childish.
8. **Ending**: a recap of what I learned and a clear next step.

## Output (≤600 words, to the file named in your assignment)

```
# <lesson-id> — <persona> — round <N>
## Scores
| Dimension | Score | Evidence (quote, step) |
(one row per dimension and per 4a–4e)
## Where I would get lost or quit
(step numbers, one line each; for reluctant, the exact step where you quit)
## Top 3 fixes
(concrete: what to change, in which step, and why it matters to me)
## Weighted lesson score
(sum of the 8 dimensions with motivation counted twice; maximum 27)
```

Every score needs a quoted piece of evidence. A 3 needs evidence too.
