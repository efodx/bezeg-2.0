# Extraction notes (round 0)

Source of truth: `adaptCatalogLesson` (`src/learning/content/catalogLessonAdapter.ts:186-202`) and the renderer `src/learning/runtime/GuidedLesson.tsx`. Scripts were dumped from the registry (the `.sl` fields) by a throwaway test, since deleted.

## Visible to the student

- Lesson title: panel heading (`GuidedLesson.tsx:559`). `summary`: only on step 1, frame 1 (`:567`).
- Each step is split into frames shown one at a time, with "Naprej"/"Nazaj" (`:535-539`) and a header "Korak N od M · Okvir K od L" (`:531`). Frame kinds come from the step's `frames`:
  - explanation: step title, `explanation` as body, then its formula blocks (`latex` plus `notation`) (`:569-571`).
  - calculation: step title plus the worked example (title, calculation, result, check) (`:572-577`); no body.
  - observation: step title plus `observationPrompt` (`:581-582`), and `expectedObservations` behind a collapsed `<details>` "Kaj bi morali opaziti" (`:441-444`, sl.ts:2079). Animation buttons only if the step has an animation (none in these four lessons).
- Scene actions run when the step is entered; `scene.expectedState` is not shown.
- End: "Vodeni primer je končan" and "Končni prizor je pripravljen. Nadaljuj s prostim raziskovanjem grafa." (`:545`, `:588`; sl.ts:2089-2090). "Nadaljuj v poglavju" only when opened from a chapter.
- Chrome: "Skrij", "Končaj" (exit), a "Guided example" tab; the last frame's primary button reads "Končaj".

## Hidden from the student

`purpose`, `scene.expectedState`, `prerequisites`, `learningGoals`, `edgeCases`, `unresolvedQuestions`, `sources`, and formula blocks or worked examples a step does not reference.

## Not present

The adapter sets no per-frame `action`, so there is no "Opazuj na grafu" button (`GuidedLesson.tsx:594` renders a footer button only when `frame.action` exists). Scripts therefore show only Nazaj/Naprej/Končaj.

## Runtime lesson ids

`bezier-pilot`, `subdivision-guided`, `curve-curvature-guided`, `polynomial-zeros-guided`.
