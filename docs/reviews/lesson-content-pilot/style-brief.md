# Lesson style brief (draft, v1)

This is the working voice for the [lesson content pilot](../../specs/lesson-content-pilot.md). It comes from the [round-1 findings](round-1/merged-findings.md) and becomes the lesson writing guide once the owner approves it. The reader is a student working alone at home, and motivation and narrative matter most.

## What the runtime gives you

- A lesson has a title, a summary shown on the first screen, and steps. Each step has an explanation frame, an optional calculation frame (worked example) and an observation frame (prompt). The prompt's answer sits behind the collapsed **"Kaj bi morali opaziti"** reveal.
- Each step can set up the graph through its scene. The student can drag points and move the demonstration's controls.
- Buttons are only Nazaj, Naprej and Končaj. The text cannot rely on any other button.
- The lesson's own last step is the only place a lesson-specific ending can go. The "Vodeni primer je končan" screen after it is generic.

## Rules

1. **Hook first.** The summary and step 1 pose one concrete question or puzzle about what is on the graph, and the lesson answers it by the end. Do not open with a definition.
2. **One question carries the lesson.** Each step opens by connecting to the previous one ("Zdaj vemo, da … Kaj pa …?") and moves the hook forward. Cut any step or aside that does not.
3. **Predict → act → reveal.** The observation prompt asks the student to guess or do something specific. The answer goes only in "Kaj bi morali opaziti", never in the prompt or in the same step's explanation.
4. **Say exactly what to touch and what to watch.** Name the point or control as it is labelled on screen (\(P_1\), drsnik \(t\)), say what to do with it, and say what to look at.
5. **Effect before formula; words before symbols.** Show or ask about the effect first. Introduce each symbol in plain words the first time it appears. Put at most one formula on a screen. Longer derivations go in the calculation frame, framed as "za tiste, ki želijo videti račun".
6. **Short screens.** An explanation frame has at most about 60 words and one idea. A prompt has one or two sentences.
7. **Numbers live on the graph.** Do not list coordinates or values in prose. Ask the student to read them from the screen, and quote at most one reference value in the reveal.
8. **No interface admin** (slider ranges, resets, what hides itself) unless the student needs it to act.
9. **Ending = payoff.** The last step answers the hook in two to four short sentences that recap what was learned, then gives one concrete challenge to try in free exploration.
10. **Voice.** Use ti-form, short active sentences, and a friendly but not childish tone, with no exclamation marks in a row. Avoid "Opazimo, da", "Očitno" and "Kot vidimo". Use terms from the [terms table](../../localization.md). In math, write `\(...\)`/`\[...\]` and `{,}` for decimal commas.
11. **Mathematics stays correct.** Simplify, but never state something false. Drop content rather than distort it.
