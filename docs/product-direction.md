# Product direction

## Purpose and audience

Bezeg helps students and educators understand curve properties by changing an example and immediately seeing the result. Its central experience is an interactive mathematical graph, with controls that make the relationship between parameters and geometry understandable.

Desktop use and classroom projection take priority. Essential workflows must also work on tablets and phones, with touch and keyboard access. Slovenian remains the default app language. The current working tree provides English through an explicit language selector; browser/device verification and owner translation review remain outstanding. See [localization](localization.md). Contributor documentation is written in English.

## Important journeys

1. A student optionally enters a Guided lesson, encounters the mathematical idea and notation first, then explores a prepared graph scene and reflects on the visible result.
2. A student opens a linked demonstration directly, identifies its purpose, changes a parameter or control point, and understands the effect.
3. An educator prepares an example, saves it locally or exports its preset, and reopens it for a class.
4. An educator enters presentation mode and keeps the graph legible while retaining access to essential controls.
5. A user exports a mathematically faithful figure as SVG or PNG.
6. A contributor adds or improves a demonstration without duplicating hosting logic or mixing geometry with application controls.

## Tool usability

Make the selected curve and active editing mode visible. Group controls by intent: explore the mathematical construction, edit geometry, adjust the view, and save/export. Give sliders meaningful labels and visible values; explain domain restrictions and unavailable actions.

Replace dependence on hover for essential actions with explicit controls that also work through touch and keyboard input. Give icon buttons accessible names and plain-language help. Describe that presets are stored in this browser and that file export is the way to exchange or back up them.

The current visual-size control changes text, point, and stroke sizes; it is not viewport zoom. The redesigned terminology must make that distinction clear.

## Visual design proposal

Confirmed direction: use a calm educational workspace with a prominent graph, readable typography, consistent spacing, grouped controls, and the elderflower identity. Review visual hierarchy in normal and presentation modes; keep labels and curve distinctions legible without relying on color alone. Choose actual colors, typography, and layout through a small representative prototype rather than committing to a UI library from prose alone.

## Evidence of improvement

Use the journeys above to review whether users can find, understand, operate, save, and present a demonstration. Check essential flows with mouse, keyboard, and touch. Measure dragging and slider responsiveness on the agreed performance scenarios. Confirm that language changes preserve mathematical meaning and that exported figures match the visible construction.

These are review criteria for future work. No usability study, visual prototype, or runtime performance measurement was conducted to create this document.

The bounded Guided lesson direction is specified separately in [guided lessons](specs/guided-lessons.md). It extends the student journey without changing the graph-first workspace, route contracts, or static client-only constraint.
