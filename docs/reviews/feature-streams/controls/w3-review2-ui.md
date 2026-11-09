# Wave 3 review 2 (UI/a11y) of 42d85cbb

Read-only review; nothing run in a browser.

## Findings
1. CollisionInspect.tsx:237-246 (PlaybackButtons order). DOM/visual order is Next, Play, Previous, New. Previous after Next breaks the expected Previous, Next order. Smallest fix: add an optional `leading?: ReactNode` slot to PlaybackButtons (rendered before the buttons, e.g. `PlaybackButtons.tsx` the `<div ... role="group">` line), put Previous there; order becomes Previous, Next, Play, New. Add a test on DOM order.
2. CollisionInspect.tsx:237 / sl.ts:90. Group "Korakanje po pometanju" (sweep stepping) now contains Play/Pause which move the objects ("Resume motion"/"Ustavi gibanje" were dropped for generic "Predvajaj"/"Premor"). Play is ambiguous: sweep playback or object motion? Panel text collision_inspect_playing ("Gibanje teče") still says motion. Expected: group label neutral ("Pregled pometanja"/"Sweep inspector") or keep a motion cue near Play. Minor-medium.
3. CollisionPlayground.css:26-62 vs WorkspaceControls.css:266-285. The group carries both classes `collision-playground__buttons` and `inspector-playback`: display flex vs grid, padding, font-size, same specificity (0,1,1) for button rules, so the result depends on CSS load order. Unverified visually (needs 360 px and 200 % text check). Opacity .5 vs .45. Selectors keyed on aria-disabled/data-playing are correct and match the buttons (no dead rule found; `:disabled` rule is now unused in this file, harmless). `:only-child` is irrelevant here.
4. ChoiceSelect.tsx (reason). aria-disabled on a native select is exposed as unavailable by NVDA/JAWS/VoiceOver, but it stays operable: the list opens, the controlled value snaps back, and nothing announces the refused change. The reason is visible and described (good) but, unlike UnavailableButton (title, hidden description, live status on press), there is no status on an attempted change and no title. Acceptable for decision 34; suggest a live line on `onChange` refusal if I2 requires parity.
5. ResetExampleButton.tsx:19: `className="btn"` has no CSS (`.reset-example` unstyled); looks plain next to `inspector-playback` buttons - verify visually. Reason "Prizor že kaže primer." is understandable; "Prizor je že enak primeru." is more natural. Placement OK: B-spline directly under the ChoiceSelect (Insertion 282-283, Extraction 263-264, Nurbs 300-301); Voronoi after DegenerateModes (VoronoiControls.tsx:186), which holds the example select.

## Cleared (no finding)
- Euler (EulerGraph.tsx:362-376): aria-disabled keeps focus, reasons on press in a polite status, pressed reset on action.
- Epicycle: one-button group spans full width; label "Predvajanje"; reduced-motion reason names the slider (valid, slider exists).
- Linear map reset reason wording fine ("Preslikava je že identiteta."); key "Ponastavi primer" consistent with "Ponastavi".
- Pascal CSS: media query identical to NumberInput.css:25; selector matches `data-pascal-handle` (PascalControls.tsx:84).
- ComplexRoots CountSetter: label "Stopnja n" and hint "med 2 in 8" fine; en parity.
- sl/en keys in lockstep; no stale uses of removed keys.

Could not verify: rendering at 360 px/200 % text, screen reader output.
