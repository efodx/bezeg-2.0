# PG2 review findings (2026-10-31)

Source: engineering and UI/accessibility reviews (Sonnet 5.5, read-only) of the PG2 diff: `src/learning/playground/DrawingPlayground.{tsx,css,test.tsx}` and the `playground_*` keys. Both reviews read the code only; neither ran a browser. Line numbers refer to the reviewed PG2 work-in-progress commit.

## To repair before PG2 is accepted

1. **Medium, likely real-browser bug: double-click toggle may never fire** (`DrawingPlayground.tsx:193`, `:230-234`). Pointerdown on an anchor captures the pointer on the `svg`, so the `click`/`dblclick` target becomes the svg. `closest('[data-role="anchor"]')` then finds nothing. The test at `test.tsx:128-135` fires `doubleClick` on the anchor directly, so it cannot catch this. Fix: detect the double click in pointerup (`e.detail === 2` plus the drag's anchor index), or hit-test from `clientX/Y`. Write a test that dispatches the double click on the svg.
2. **Medium: double-click side effects.** Double-clicking empty canvas in an open drawing appends two corner anchors at the same spot, which is two undo steps and a zero-length segment. Double-clicking anchor 0 while `canClose` closes the shape and may then toggle its type as a second step. Expected: a double click on empty canvas adds at most one anchor, and a double click on an anchor is one action.
3. **Medium: unreliable focus ring** (`DrawingPlayground.css:52-56`). The `outline` is on SVG `<g>`, which renders unreliably and, where it does render, wraps the stem and hit circle. Expected: a ring `<circle>` around the dot shown by `:focus-visible`, using `--bezeg-shell-focus`.
4. **Medium: hard-coded hex colours** (`DrawingPlayground.css:84-91`): `#bd8040`, `#fffdf5`, `#d39a4a`, `#654c2b`. Use shell/graph tokens, as the handle styles already do. Check contrast against the canvas surface.
5. **Low:** Ctrl+Z on the wrapper `div` (`:247`) intercepts Z inside `controls()` content (PG3 inputs). Restrict it to the svg and toolbar.
6. **Low:** a held arrow key writes storage on every repeat (`:118`). Save only when a step is committed.
7. **Low:** *Load example* commits a no-op undo step when the drawing is already the example. The `selected` index is not reset on undo/redo.
8. **Low:** after the last anchor is deleted, focus drops to `body`. Move it to the canvas or to the Add/Clear button.
9. **Low:** `role="toolbar"` without arrow-key roving. Use a labelled `role="group"` or implement roving. Handles use `role="button"` but do not activate; consider another role.
10. **Low:** the announce effect announces on mount under StrictMode in development only.
11. **Test gaps:** null `getScreenCTM` fallback, pointer-capture retargeting, double click on empty canvas.

## Decide or document

- Two mounted instances (draw and inspect placements) read the saved drawing on mount but do not sync live. The last writer wins. The two placements sit in different chapter sections, so documenting this may be enough. PG3 may also want a selected-segment index and a setter in `ctx`.
- The term *ročica* (handle) is not verified against an external Slovenian source. The Inkscape Slovenian tutorial (https://inkscape.org/doc/advanced/tutorial-advanced.sl.html) returned 403 to the handler. Check the Inkscape `po/sl.po` msgstr for "handle" or another reference, and update the term row and the spec's Terms section.

## Cleared by review

- No window/document listeners.
- The ResizeObserver and timers are disposed.
- Unmount mid-drag, `pointercancel` and `lostpointercapture` are safe.
- A drag is one undo step.
- No ref reads during render.
- Persistence (key, try/catch, validation, blocked storage).
- CTM fallback.
- Localization lockstep and typed `t()`.
- Accessible names, aria-pressed, tab order.
- 44px toolbar targets and 22px coarse hit radius.
- `touch-action` only on the svg.
- The live region is polite and debounced.
