# Wave 3 P1/D1 UI and accessibility review (d0a72a48)

Static review; no browser or screen reader run.

1. MEDIUM DecasteljauAnimationControls.tsx (output at the heading, ~line 41): `<output>` has an implicit status role with a polite live region, so dropping `aria-live` does not silence it. `t` is announced by `<output>` on every change, during play too, and again by `LiveReadout` after settling. Expected: one announcer. Make the visible text `aria-live="off"` / `role="presentation"`-equivalent, or hide it from AT (`aria-hidden`).
2. LOW WorkspaceControls.css:252-257,306-307: `.decasteljau-animation-play` is no longer rendered and `.inspector-playback-primary` is not set by PlaybackButtons, so De Casteljau's green primary Play and the ▶ Ⅱ ■ glyph spans are lost. The `.decasteljau-animation-actions button` rules still match (className is merged); the `-play` rules are dead. Expected: delete the dead rules or accept the change in the spec.
3. LOW ArcLengthParametrizationGraph / ParametricCurveGraph: the group label is "Animacija konstrukcije" (`animation_controls`). That is wrong for a point on an arc and for a cycloid roll. The button now says only "Predvajaj", and the old "Predvajaj premikanje točke" name and the roll's "Kotali" are gone. Expected: a per-graph group label (what plays).
4. INFO Arc length: the old reduced-motion text pointed to the slider; the generic reason `playback_block_reduced_motion` ("...zato predvajanje ni na voljo") does not. The slider remains operable. Recommend appending "Uporabite drsnik." / "Use the slider." or keeping the hint beside the slider.
5. LOW Roll with `PlaybackButtons` alone: the 2-column grid puts one button at half width. With the arc-length group the same applies. Check at 320 px.
6. OK PlaybackButtons: with Next or Reset omitted the group label stays; `UnavailableButton` keeps `aria-disabled` and so keeps focus; the reason region (`role=status`) is unchanged; `data-playing` is only on play-pause. The pressed reason persists after the block clears (pre-existing).
7. OK RevealButton: no `aria-pressed`, the label swap is the state, plain `<button>`. `.taylor-actions button` (min-height 44 on coarse pointer, FunctionReadout.css:109) and `[data-revealed]` still match. I did not check the 18 wrappers individually.
8. LOW Linear map: the three `OnOffSwitch` rows sit below the Reset group, labels unchanged in both languages. The `data-action="toggle-linear-map-*"` hooks are removed; no src use remains, but check docs/smoke-tests and captures.
9. OK AngleSlider: props identical to the old copy (0-360, step 1, `°`, fieldDecimals 2); labels come from callers.
10. Strings: `play`/`pause`/`reset` reuse is consistent. The old arcparam and roll keys appear removed from sl.ts. Not verified: en.ts wording and parity.
