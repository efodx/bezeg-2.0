# AB-C-6 F3 recheck: brief (handoff-v12)

- **Role:** smoke, one narrow recheck. No source edits, no commits, no pushes. Write only the report and captures named below.
- **Goal:** settle [F3](ab-c-6-gate.md#open-f3-closing-the-lesson): does closing a lesson that was opened **in the page** return the Coons route to the state it had before the lesson?
- **Context:** the handler owns the preview on `http://127.0.0.1:4314/bezeg-2.0`, already running a provenance-checked production build of the revision named in the dispatch message. Do not build or stop it. Run Playwright from a script under the job tmp folder named in the dispatch message. `scripts/coons-gate-perf.cjs` shows how to find a control point's screen position and drag it. Watch page errors, console errors and failed requests.

## Check

Use one page, 1440×900, Slovenian, and never call `goto` or reload after the first load of `/bezeg-2.0/patches/coons`.

1. Change the scene: set the shown surface select (*Ploskev*) to \(B\), and drag the control point `c0-1`. Record the select's value, the interior-net readout, and the point's coordinates.
2. Open the lesson with the page's own button *Spoznaj to demonstracijo*. Record the URL, and confirm no document navigation happened (a `framenavigated` listener or a marker set on `window` before the click that survives).
3. Move to the next frame or two with the lesson's own buttons, then close the lesson with its own close control. If it asks to confirm, take the option that restores the graph, and quote that text.
4. Read the same three values and the URL. Compare with step 1.
5. Repeat steps 1 to 4 once, walking to the end of the lesson and closing from there.
6. Control: the same scene change, then load the lesson by a new page load of the `?learn=1` URL, close it, and read the values. This reproduces what the gate pass saw; a default scene here is expected.

## Return

Reply in at most 20 lines: for each of runs 5, 1 and 6, the values before and after, the URL after, and whether the marker survived. Say plainly whether the state returned. Write the report to `docs/reviews/advanced-bezier/ab-c-6-f3-smoke.md` and screenshots to the job tmp folder named in the dispatch message. Do not commit.

Budget: past about 15 turns, or on `HANDOFF`, stop, write what you have, and return it as partial.
