# Row brief (clips step 3)

Shared `handoff-v13` brief for every row worker. The dispatch names your Demonstrations and your row file. Read this file and `scripts/demonstration-clip-rows/README.md`, then the lessons. Do not read `scripts/demonstration-preview-motion.cjs` or `_driver.cjs`.

## Role

You are a `bezeg-worker`. You write clip rows. Edit only the row file named in your dispatch, and the handoff note if you stop early. Do not commit, push, delegate or run a capture. Do not change any `_*.cjs` file, test, check or lesson.

## Goal

One row per named Demonstration, taken from what its lesson tells the learner to do. Source: `docs/specs/lesson-guided-catalog-clips.md`, "Owner decisions" and "Choosing the motion".

## How to choose each row

1. Read the probe entry: in `docs/reviews/feature-streams/clips/route-probe.json`, find the entry with the `id`. Do not open the whole file: use `node -e` to print that one entry's `exampleCandidates`, its `controls` where `tab` is `edit`, and its `draggablePoints`. Ignore controls in the `display` and `save` tabs: element size and camera are never the motion.
2. Find the lesson: search `src/learning/content` for the Demonstration's ID, then read that lesson's steps. Read `observationPrompt` and the step text.
3. Take the motion the lesson asks the learner to perform: "premakni drsnik", "povleci točko". If it names several, take the one that shows the lesson's main idea. If its prose names none, use the most continuous control in its scenes and quote the step that uses it.
4. `lessonQuote` is that sentence, copied exactly. In a row file, write each backslash of the lesson's source as it appears there: `\\(d\\)` stays `\\(d\\)`.
5. Pick the control:
   - A slider with a fine step: `parameter-sweep`.
   - A draggable point: `pointer-drag`.
   - A number field such as "Točka 1, x", when the lesson moves that value: `parameter-sweep` with `kind: 'number'`.
   - A stepper button, an integer slider or a coarse slider: `discrete-exact-steps`, with a `discreteReason` saying why smooth motion is impossible.
   - A point confined to a curve or circle: use its slider if one exists. Straight drag legs leave the curve and fail the state check.
   - A drag on a compgeo graph (route under `/compgeo/` or a triangle-geometry view built on `PointSetGraph`) gets `fineGrid: -8`; see "Fine grid" in `scripts/demonstration-clip-rows/README.md`. `SimsonLineGraph`, `InversionGraph`, `VoronoiGraph` and `PointInPolygonGraph` bind their own drags, so the fine grid does not reach them: prefer a slider there, or list the row as unresolved.
6. Check the quote against the example scene. The probe's `checkbox` controls in the `edit` tab show what is on when the clip starts, and a row cannot change them. If the quote's object is off there, such as a point it says to show or a readout it says to read, look for another step that asks for the same motion on what is visible, and use that quote. If no step fits, keep the quote that names the motion and say what is missing in "least sure". Do the same for a quote from a step with another algorithm, curve or point set than the example: a different scene is a reason to look further.
7. Before choosing a drag, confirm the picture responds to it from the start scene. Search the graph's source if needed: a drag that only moves a dot, because the figure is drawn later, is not a row. List it as unresolved.
8. Pick the path. It goes out and back, and its first and last entries are equal and match the example scene: the slider's `value`, or the point's `x` and `y`. Stay inside the slider's range. Keep moved objects on screen: the camera is fixed to the start scene, so prefer a moderate move that is visible at card size, about a fifth of the board's width or more for a point.

## Never

- Never use `discrete-exact-steps` when a smooth control exists. The owner ruled out cuts where smooth motion is possible.
- Never invent or paraphrase a quote, and never pick a control only because it is first in the list.
- Never take a quote from another Demonstration's lesson.

If a Demonstration has no smooth control and no stepper the lesson uses, do not force a row. List it under "unresolved" in your report with what you found, and the handler decides.

## Checks

Run these and fix what they report. Both must pass before you return.

```
node scripts/demonstration-clip-rows/_check.cjs <row file name without .cjs>
just lint scripts/demonstration-clip-rows/<row file>.cjs
```

## Return

At most 120 words, plus one line per row: `id | motion | control | path | lesson file:line`. Say which rows you are least sure of and why. Add a list of anything unresolved. Report only what you ran.

## Budget

On a `HANDOFF` signal, keep the finished rows, name the Demonstrations not yet done, and return partial.
