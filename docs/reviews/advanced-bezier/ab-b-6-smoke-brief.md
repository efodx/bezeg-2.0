# AB-B-6 browser pass: brief (handoff-v12)

- **Role:** smoke, gate pass of a new lesson and card. No source edits, no commits, no pushes. Write only the report and captures named below.
- **Goal:** the browser part of the Batch B gate for D2 `bezier-clipping` (spec `docs/specs/advanced-bezier-lessons.md`, section D2): the chapter page with four cards, the catalog poster, the Play instruction of lesson steps 5 and 6, and the workflows the unit tests cannot show.
- **Scope:** `/bezeg-2.0/bezier/clipping`, its lesson, the chapter page of `advanced-bezier`, the Bézier catalog, the strand page that holds the chapter. Not the full checklist. Follow `.agents/skills/smoke-tester/SKILL.md` and the relevant rows of `docs/smoke-tests.md`.
- **Context:** the handler owns the preview on `http://127.0.0.1:4314/bezeg-2.0`, already running and serving a provenance-checked production build of the revision named in the dispatch message. Do not build or stop it. Run Playwright from a script under the job tmp folder named in the dispatch message. Watch page errors, console errors and failed requests on every page, and say which pages were not watched.
- **Graph facts:** curve A is solid, curve B is dashed. Default pair \(A=(0,0),(2,4),(4,0)\), \(B=(0,3),(2,-1),(4,3)\). Selectors: `[data-bezier-clipping="tolerance|step|status|clips|widest|table|row|further|inset|inset-svg|inset-caption"]`, `data-status` on the status line; the buttons are found by `[data-action]` in `src/graphs/compgeo/BezierClippingControls.tsx`. Read the lesson's eight steps in `src/learning/content/bezierClippingGuidedLessons.ts`, and the lesson URL from `docs/reviews/advanced-bezier/guided-example-inventory.json`.
- **A tolerance change returns the run to step 0.** That is why lesson steps 5 and 6 tell the student to press Play. Any check that compares clip counts after a tolerance change must press Play or Next to the end first.

## Checks

1. **Chapter, Slovenian and English.** The `advanced-bezier` chapter page shows four sections and four cards with `bezier-clipping` among them. Every image loads with non-zero `naturalWidth`. Each card opens its own lesson on the first frame. Read the `bezier-clipping` card copy against the card image in both languages. Report the section order. Screenshot the page at 1440×900.
2. **Catalog.** The Bézier family page shows the `bezier-clipping` poster, not an empty frame: image loaded, 720×440 natural size, no broken image anywhere on the catalog. Report the count of catalog images and broken ones. Compare the poster with the live route after four presses of Next with control polygons and hulls off: same scene.
3. **Strand.** The strand that holds the chapter lists it in both languages.
4. **Lesson walk as a student, Slovenian, 1440×900.** Walk all eight steps with the lesson's own buttons, reading the prompts and predictions. Report anything a prompt says that the board or readout does not show, in particular any prompt that reads a clip count or status.
5. **Lesson steps 5 and 6, the Play instruction.** This is the one thing only read in code so far. In each step follow the prompt word for word: choose the named tolerance, then press Play as it says, and wait for the run to stop. Report the tolerance, final status, clip count and table rows you see, and whether they match the numbers the step's text quotes. Then do the wrong path: change the tolerance and do not press Play. Report what the readout shows (expect clip count 0) and whether the text still makes sense.
6. **Closing the lesson.** Close it mid-run and with Play running where the step allows it. The Demonstration state returns and playback stays stopped. No timer keeps moving the step.
7. **Language switch mid-lesson.** Position kept, text changes language, the board does not move.
8. **Greyscale.** Take a 1440×900 screenshot of lesson step `clipping-clip-a`, convert it to greyscale, and say whether kept ranges, discarded ranges, A, B and the fat line can be told apart without colour. Give the screenshot path and what you saw.
9. **Phone, 390×844.** No horizontal page overflow on the route and in the lesson (`document.documentElement.scrollWidth` against the viewport). *Opazuj na grafu* or its counterpart shows the graph, and the curves are visible on it; report their pixel size.
10. **Reduced motion.** With `reducedMotion: 'reduce'`, say what Play does, and that the state stays consistent.
11. **Preset round trip.** Save a Preset mid-run, change something, restore it. Say what is restored. Reset returns to the default pair at step 0.
12. **Regression, one neighbour.** `/bezeg-2.0/compgeo` route of the convex hull curve pair, found through `src/demonstrations.ts` as the host of `BezierHullsGraph`: it loads and its Next works, because its lifecycle was lifted in AB-B-1.
13. **No degree above 3.** List the route's controls: none adds a control point or sets a degree. Import a Preset with a degree-4 pair, written by the format of `src/graphs/compgeo/bezierClippingPresetCollection.ts`: it is refused with an actionable message and the board does not change.

## Return

Reply in at most 40 lines: one line per check (passed, failed, not run) with the observed value. Put any failure first, with the expected and the observed value. A failure of expectation is not always a defect: if the brief's expectation may be the wrong one, say so. Write the full report to `docs/reviews/advanced-bezier/ab-b-6-smoke.md` and screenshots to the job tmp folder named in the dispatch message. Do not commit.

Budget: past about 30 turns, or on `HANDOFF`, stop, write what you have to that report, and return it as partial.
