# AB-B-2b browser pass: brief (handoff-v12)

- **Role:** smoke, first pass of new UI. No source edits, no commits, no pushes. Write only the report and captures named below.
- **Goal:** first browser check of the D2 Demonstration at `/bezeg-2.0/bezier/clipping` (spec `docs/specs/advanced-bezier-lessons.md`, section D2), and answers to three open questions.
- **Scope:** the one route, the Bézier family catalog page, and a language switch. Not a full checklist run. Follow `.agents/skills/smoke-tester/SKILL.md` and the relevant rows of `docs/smoke-tests.md`.
- **Context:** the handler owns the preview on `http://127.0.0.1:4314/bezeg-2.0`, already running and serving a provenance-checked production build of the revision named in the dispatch message. Do not build or stop it. Run Playwright from a script under the job tmp folder named in the dispatch message, not through `npx playwright test`. `require('playwright')` resolves from the repository root, so run the script with the repository root as the working directory and pass the script path as an argument.
- **Graph facts:** curve A is solid, curve B is dashed. Default pair \(A=(0,0),(2,4),(4,0)\), \(B=(0,3),(2,-1),(4,3)\). Selectors: `[data-bezier-clipping="tolerance|step|status|clips|widest|table|row|further|inset|inset-svg|inset-caption"]`, `data-status` on the status line, buttons `[data-action="next-step|play-pause|reset"]`. The Next, Play and Reset buttons use `aria-disabled`, not `disabled`. The JSXGraph board is the last of `window.JXG.boards`.
- **Loading another pair:** export a Preset from the page's Preset controls, or write a file by the format of `src/graphs/compgeo/bezierClippingPresetCollection.ts`, then import it through the page's Preset import control. Tangent pair: same A, \(B=(0,4),(2,0),(4,4)\). Offset pair: same A, \(B=(0,4.5),(2,0.5),(4,4.5)\) with `gridStepExponent` \(-1\). If import proves impractical after two attempts, drag the points where the grid allows and say so.

## Checks

1. **Route.** Page loads with no page error or console error, title *Presečišča z Bézierovim rezanjem*, card in the Bézier family without a poster (poster is pending; the empty preview frame is expected). `lesson: false`, so no lesson link is expected.
2. **Crossing pair at \(10^{-6}\).** Press Next to the end. Report the final status, clip count, table rows and their ranges. Expect `found`, ranges around \(0.25\) and \(0.75\) on both curves.
3. **Question 1, grey dashes.** With `fatLine`, `kept` and `discarded` overlays on after a few steps, take a 1440×900 screenshot of the board. Do the grey discarded dashes hide or blur the dashed B so that the two cannot be told apart? Answer yes or no with the screenshot path and what you saw.
4. **Question 2, inline table styling.** Screenshot the table at the tangent pair at \(10^{-10}\) (the longest table) at 1920×1080 with `deviceScaleFactor` 1 (projection) and at 390×844 (phone). Does it fit its panel with no horizontal page scroll? Report `document.documentElement.scrollWidth` against the viewport, and whether text is clipped or wraps badly.
5. **Question 3, tangent pair at \(10^{-10}\).** Load the tangent pair, set the tolerance to \(10^{-10}\), press Next to the end (loop until `aria-disabled="true"`). Report the real final `data-status`, clip count, row count and the "further" row text. Do the same at \(10^{-6}\) and \(10^{-3}\): lesson step 6 depends on these numbers.
6. **Offset pair at \(10^{-6}\).** Expect `overlapping` at step 0 and `empty` at the end; report the clip count.
7. **Drag resets.** Mid-run, drag a control point of B. Step returns to 0, playback pauses, the status and the inset change. Do the same with a tolerance change.
8. **Play, Pause, Reset.** Play advances and stops at the end; Pause holds; Reset returns to step 0.
9. **Language switch.** Mid-run, switch to English and back. Status, table and inset caption change language; the step and board do not.
10. **Keyboard.** The select and the three buttons can be reached and used by keyboard, with a visible focus.

## Return

Reply in at most 40 lines: one line per check (passed, failed, not run) with the observed value, the three answers first. Write the full report to `docs/reviews/advanced-bezier/ab-b-2b-smoke.md` and screenshots to the job tmp folder named in the dispatch message. Do not commit.

Budget: past about 30 turns, or on `HANDOFF`, stop, write what you have to that report, and return it as partial.
